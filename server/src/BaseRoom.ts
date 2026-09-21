import { Room as ColyseusRoom, type Client, CloseCode } from "@colyseus/core";
import { Schema } from "@colyseus/schema";
import { z } from "zod";
import { InputFrame } from "./NetTypes";
import { ClientAckTracker, World, ComponentRegistry, EventRegistry } from "@tiny-aster/core";
import { ReplicationStrategy } from "./replication/ReplicationStrategy";

const GenericRoom = ColyseusRoom as any as { new <T extends Schema = Schema>(): ColyseusRoom<{ state: T }> };

export const BaseRoomOptionsSchema = z.object({
  seed: z.number().int().optional(),
  replicationMode: z.enum(['legacy', 'interest', 'delta', 'budget', 'binary']).optional()
});

export const BaseJoinOptionsSchema = z.object({
  name: z.string().max(32).optional()
});

export const BaseInputFrameSchema = z.object({
  protocolVersion: z.number().optional(),
  tick: z.number().int().nonnegative(),
  timestamp: z.number().optional(),
  actions: z.array(z.string().max(32)).max(16),
  axes: z.record(z.string().max(32), z.number())
});

/**
 * Core interface representing properties expected on Colyseus room states.
 * @public
 */
export interface BaseRoomState {
  gameWidth?: number;
  gameHeight?: number;
  gameStarted?: boolean;
  gameOver?: boolean;
  serverTick?: number;
  lastProcessedTick?: number;
  seed?: number;
  protocolVersion?: number;
  players?: { delete(key: string): boolean } | Map<string, unknown>;
}

/**
 * Minimal contract for simulation engines executing within authoritative server rooms.
 * @public
 */
export interface ISimulationEngine {
  applyInputToEntity?(entity: number, input: InputFrame): void;
  runSimulationStep?(dt: number, isReplaying?: boolean): void;
  destroy?(): void;
  blueprints?: { get(id: string): unknown };
}

/**
 * Minimal contract for incoming tick synchronisation messages.
 * @public
 */
export interface SyncTickData {
  lastAckedVersion?: number;
  sequence?: number;
  timestamp?: number;
}

export abstract class BaseRoom<
  TState extends Schema = Schema,
  TComponents extends ComponentRegistry = ComponentRegistry,
  TEvents extends EventRegistry = EventRegistry
> extends GenericRoom<TState> {
  protected fixedTimeStep = 16.66;
  protected inputBuffers = new Map<string, InputFrame[]>();
  protected clientAcks = new Map<string, number>();
  protected newClients = new Set<string>();
  protected playerEntities = new Map<string, number>();
  protected ackTracker = new ClientAckTracker();
  protected gameSimulation: ISimulationEngine | null = null;
  protected world: World<TComponents, TEvents> | null = null;
  protected replicationStrategy?: ReplicationStrategy;
  protected allowedActions: string[] = [];

  /**
   * Helper getter providing typed access to room state fields.
   */
  protected get roomState(): (TState & BaseRoomState) | undefined {
    return this.state as (TState & BaseRoomState) | undefined;
  }

  /**
   * Abstract hook to initialize game simulation and ECS world.
   */
  protected abstract setupSimulation(options: unknown): Promise<{ world: World<TComponents, TEvents>; gameSimulation: ISimulationEngine } | void> | { world: World<TComponents, TEvents>; gameSimulation: ISimulationEngine } | void;

  /**
   * Abstract hook to spawn a player entity and return its entity ID or state representation.
   */
  protected abstract spawnPlayer(client: Client, validOptions: unknown): number | void;

  /**
   * Abstract hook to despawn a player entity when disconnected.
   */
  protected abstract despawnPlayer(client: Client, entity?: number): void;

  /**
   * Abstract hook to synchronize authoritative ECS world state to Colyseus Schema state.
   */
  protected abstract syncWorldToSchema(): void;

  async onCreate(options: unknown): Promise<void> {
    const parsedOptions = BaseRoomOptionsSchema.safeParse(options);
    const validOptions = parsedOptions.success ? parsedOptions.data : {};

    const setupResult = await this.setupSimulation(options);
    if (setupResult) {
      this.world = setupResult.world;
      this.gameSimulation = setupResult.gameSimulation;
    }

    const state = this.roomState;
    if (state) {
      if ('gameWidth' in state && state.gameWidth === undefined) {
        state.gameWidth = 800;
      }
      if ('gameHeight' in state && state.gameHeight === undefined) {
        state.gameHeight = 600;
      }
      if ('gameStarted' in state) {
        state.gameStarted = false;
      }
      if ('gameOver' in state) {
        state.gameOver = false;
      }
      if ('serverTick' in state) {
        state.serverTick = 0;
      }
      if ('seed' in state && !state.seed) {
        state.seed = validOptions.seed || Math.floor(Math.random() * 0xFFFFFFFF);
      }
    }

    this.setPatchRate(50);
    this.setSimulationInterval((dt: number) => this.tick(dt));

    this.onMessage("input", (client: Client, frame: unknown) => {
      this.handleInputMessage(client, frame);
    });

    this.onMessage("sync_tick", (client: Client, data: SyncTickData) => {
      this.handleSyncTickMessage(client, data);
    });
  }

  protected handleInputMessage(client: Client, frame: unknown): void {
    const parsedFrame = BaseInputFrameSchema.safeParse(frame);
    if (!parsedFrame.success) {
      console.warn(`[${this.constructor.name}] Malformed input frame from ${client.sessionId}`);
      return;
    }

    const validFrame = parsedFrame.data as unknown as InputFrame;
    const currentServerTick = this.roomState?.serverTick ?? 0;

    // Bounds check against tick manipulation or negative ticks
    if (validFrame.tick < Math.max(0, currentServerTick - 120) || validFrame.tick > currentServerTick + 1000) {
      return;
    }

    const filteredActions = this.allowedActions.length > 0
      ? validFrame.actions.filter(a => this.allowedActions.includes(a))
      : validFrame.actions;

    const sanitizedAxes: Record<string, number> = {};
    if (validFrame.axes) {
      const axisEntries = Object.entries(validFrame.axes);
      if (axisEntries.length <= 16) {
        for (const [key, rawVal] of axisEntries) {
          const val = Number(rawVal);
          if (!isNaN(val) && isFinite(val)) {
            sanitizedAxes[key] = Math.max(-1, Math.min(1, val));
          }
        }
      }
    }

    const protocolVer = typeof validFrame.protocolVersion === "number" && !isNaN(validFrame.protocolVersion) && validFrame.protocolVersion > 0
      ? validFrame.protocolVersion
      : 1;

    const sanitizedFrame: InputFrame = {
      protocolVersion: protocolVer,
      tick: validFrame.tick,
      timestamp: (typeof validFrame.timestamp === "number" && !isNaN(validFrame.timestamp) && validFrame.timestamp > 0)
        ? validFrame.timestamp
        : Date.now(),
      actions: filteredActions,
      axes: sanitizedAxes
    };

    const buffer = this.inputBuffers.get(client.sessionId) || [];
    if (buffer.some(f => f.tick === sanitizedFrame.tick)) {
      return;
    }

    buffer.push(sanitizedFrame);
    if (buffer.length > 120) {
      buffer.shift();
    }
    this.inputBuffers.set(client.sessionId, buffer);
  }

  protected handleSyncTickMessage(client: Client, data: SyncTickData): void {
    const currentServerTick = this.roomState?.serverTick ?? 0;
    const protocolVersion = this.roomState?.protocolVersion ?? 1;

    if (data?.lastAckedVersion !== undefined) {
      this.clientAcks.set(client.sessionId, data.lastAckedVersion);
    }
    if (data?.sequence !== undefined) {
      this.ackTracker.recordAck(client.sessionId, data.sequence, currentServerTick);
    }

    client.send("sync_tick", {
      protocolVersion,
      serverTick: currentServerTick,
      timestamp: (typeof data?.timestamp === "number" && !isNaN(data.timestamp) && isFinite(data.timestamp) && data.timestamp > 0) ? data.timestamp : Date.now()
    });
  }

  onJoin(client: Client, options: unknown): void {
    const parsedOptions = BaseJoinOptionsSchema.safeParse(options);
    const validOptions = parsedOptions.success ? parsedOptions.data : {};

    this.inputBuffers.set(client.sessionId, []);
    this.newClients.add(client.sessionId);

    const entity = this.spawnPlayer(client, validOptions);
    if (typeof entity === "number") {
      this.playerEntities.set(client.sessionId, entity);
    }
  }

  async onLeave(client: Client, code: number): Promise<void> {
    // Freeze/clear active input buffer on disconnect so ghost inputs aren't applied during reconnection wait
    this.inputBuffers.set(client.sessionId, []);
    try {
      if (code === CloseCode.CONSENTED) {
        throw new Error("consented leave");
      }
      await this.allowReconnection(client, 10);
    } catch {
      this.cleanupClient(client);
    }
  }

  protected cleanupClient(client: Client): void {
    const entity = this.playerEntities.get(client.sessionId);
    this.despawnPlayer(client, entity);

    const state = this.roomState;
    if (state && 'players' in state && state.players) {
      state.players.delete(client.sessionId);
    }

    this.playerEntities.delete(client.sessionId);
    this.inputBuffers.delete(client.sessionId);
    this.clientAcks.delete(client.sessionId);
    this.newClients.delete(client.sessionId);
  }

  public update(dt: number): void {
    this.tick(dt);
  }

  protected tick(dt: number): void {
    const state = this.roomState;
    if (state && 'gameStarted' in state && !state.gameStarted) {
      return;
    }

    if (state && 'serverTick' in state && typeof state.serverTick === "number") {
      state.serverTick++;
      state.lastProcessedTick = state.serverTick;
    }

    this.collectInputsForTick();
    this.runSimulationStep(dt);
    this.syncWorldToSchema();
    this.replicate();
    this.cleanupProcessedInputs();
  }

  protected collectInputsForTick(): void {
    const currentTick = this.roomState?.serverTick;
    if (currentTick === undefined || !this.gameSimulation?.applyInputToEntity) return;

    this.playerEntities.forEach((entity, sessionId) => {
      const buffer = this.inputBuffers.get(sessionId);
      if (buffer) {
        const frame = buffer.find(f => f.tick === currentTick);
        if (frame) {
          this.gameSimulation!.applyInputToEntity!(entity, frame);
        }
      }
    });
  }

  protected runSimulationStep(_dt: number): void {
    if (this.gameSimulation?.runSimulationStep) {
      this.gameSimulation.runSimulationStep(this.fixedTimeStep, false);
    }
  }

  protected replicate(): void {
    if (this.replicationStrategy) {
      const currentTick = this.roomState?.serverTick ?? 0;
      this.replicationStrategy.replicate(this, this.clients, this.state, currentTick);
    }
  }

  protected cleanupProcessedInputs(): void {
    const currentTick = this.roomState?.serverTick;
    if (currentTick === undefined) return;

    this.inputBuffers.forEach((buffer, sessionId) => {
      this.inputBuffers.set(sessionId, buffer.filter(f => f.tick > currentTick));
    });
  }

  onDispose(): void {
    this.playerEntities.clear();
    this.inputBuffers.clear();
    this.clientAcks.clear();
    this.newClients.clear();
    if (this.gameSimulation?.destroy) {
      this.gameSimulation.destroy();
    }
    this.gameSimulation = null;
    this.world = null;
  }
}
