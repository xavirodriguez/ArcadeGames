import { Room as ColyseusRoom, type Client, CloseCode } from "@colyseus/core";
import { Schema } from "@colyseus/schema";
import { z } from "zod";
import { InputFrame } from "./NetTypes";
import { ClientAckTracker } from "@tiny-aster/core";
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
  actions: z.array(z.string()),
  axes: z.record(z.string(), z.number())
});

export abstract class BaseRoom<TState extends Schema = Schema> extends GenericRoom<TState> {
  protected fixedTimeStep = 16.66;
  protected inputBuffers = new Map<string, InputFrame[]>();
  protected clientAcks = new Map<string, number>();
  protected newClients = new Set<string>();
  protected playerEntities = new Map<string, number>();
  protected ackTracker = new ClientAckTracker();
  protected gameSimulation: any;
  protected world: any;
  protected replicationStrategy?: ReplicationStrategy;
  protected allowedActions: string[] = [];

  /**
   * Abstract hook to initialize game simulation and ECS world.
   */
  protected abstract setupSimulation(options: unknown): Promise<{ world: any; gameSimulation: any } | void> | { world: any; gameSimulation: any } | void;

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

    if (this.state) {
      if ('gameWidth' in (this.state as any) && (this.state as any).gameWidth === undefined) {
        (this.state as any).gameWidth = 800;
      }
      if ('gameHeight' in (this.state as any) && (this.state as any).gameHeight === undefined) {
        (this.state as any).gameHeight = 600;
      }
      if ('gameStarted' in (this.state as any)) {
        (this.state as any).gameStarted = false;
      }
      if ('gameOver' in (this.state as any)) {
        (this.state as any).gameOver = false;
      }
      if ('serverTick' in (this.state as any)) {
        (this.state as any).serverTick = 0;
      }
      if ('seed' in (this.state as any) && !(this.state as any).seed) {
        (this.state as any).seed = validOptions.seed || Math.floor(Math.random() * 0xFFFFFFFF);
      }
    }

    this.setPatchRate(50);
    this.setSimulationInterval((dt: number) => this.tick(dt));

    this.onMessage("input", (client: Client, frame: unknown) => {
      this.handleInputMessage(client, frame);
    });

    this.onMessage("sync_tick", (client: Client, data: any) => {
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
    const currentServerTick = (this.state as any)?.serverTick ?? 0;

    // Bounds check against tick manipulation or negative ticks
    if (validFrame.tick < 0 || validFrame.tick > currentServerTick + 1000) {
      return;
    }

    const filteredActions = this.allowedActions.length > 0
      ? validFrame.actions.filter(a => this.allowedActions.includes(a))
      : validFrame.actions;

    const sanitizedAxes: Record<string, number> = {};
    if (validFrame.axes) {
      for (const [key, rawVal] of Object.entries(validFrame.axes)) {
        const val = Number(rawVal);
        if (!isNaN(val) && isFinite(val)) {
          sanitizedAxes[key] = Math.max(-1, Math.min(1, val));
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

  protected handleSyncTickMessage(client: Client, data: any): void {
    const currentServerTick = (this.state as any)?.serverTick ?? 0;
    const protocolVersion = (this.state as any)?.protocolVersion ?? 1;

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

    if (this.state && 'players' in (this.state as any) && (this.state as any).players) {
      (this.state as any).players.delete(client.sessionId);
    }

    this.playerEntities.delete(client.sessionId);
    this.inputBuffers.delete(client.sessionId);
    this.clientAcks.delete(client.sessionId);
    this.newClients.delete(client.sessionId);
  }

  protected tick(dt: number): void {
    if (this.state && 'gameStarted' in (this.state as any) && !(this.state as any).gameStarted) {
      return;
    }

    if (this.state && 'serverTick' in (this.state as any)) {
      (this.state as any).serverTick++;
      (this.state as any).lastProcessedTick = (this.state as any).serverTick;
    }

    this.collectInputsForTick();
    this.runSimulationStep(dt);
    this.syncWorldToSchema();
    this.replicate();
    this.cleanupProcessedInputs();
  }

  protected collectInputsForTick(): void {
    const currentTick = (this.state as any)?.serverTick;
    if (currentTick === undefined || !this.gameSimulation?.applyInputToEntity) return;

    this.playerEntities.forEach((entity, sessionId) => {
      const buffer = this.inputBuffers.get(sessionId);
      if (buffer) {
        const frame = buffer.find(f => f.tick === currentTick);
        if (frame) {
          this.gameSimulation.applyInputToEntity(entity, frame);
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
      const currentTick = (this.state as any)?.serverTick ?? 0;
      this.replicationStrategy.replicate(this, (this as any).clients, this.state, currentTick);
    }
  }

  protected cleanupProcessedInputs(): void {
    const currentTick = (this.state as any)?.serverTick;
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
  }
}
