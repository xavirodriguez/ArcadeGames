import { Packr } from "msgpackr";
import { ServerUpdatePayload } from "./NetTypes";
import { WorldSnapshot } from "../snapshots/WorldSnapshot";
import { World } from "../ecs/World";
import { System } from "../ecs/System";
import { ComponentRegistry } from "../ecs/Component";
import { EventRegistry } from "../events/EventBus";

const packr = new Packr({
    useRecords: false,
    structuredClone: true
});

/**
 * Tracks historical state baselines per client for delta compression.
 * @public
 */
export class ReplicationStateTracker {
  private clientBaselines: Map<string, Record<number, any>> = new Map();

  /**
   * Saves a state snapshot baseline for a client at a specific tick.
   */
  public saveBaseline(sessionId: string, tick: number, state: any): void {
    let history = this.clientBaselines.get(sessionId);
    if (!history) {
      history = {};
      this.clientBaselines.set(sessionId, history);
    }
    history[tick] = JSON.parse(JSON.stringify(state)); // Deep copy state

    // Evict old baselines to prevent memory leaks (keep last 120 ticks of baseline history)
    const ticks = Object.keys(history).map(Number).sort((a, b) => a - b);
    if (ticks.length > 120) {
      delete history[ticks[0]];
    }
  }

  /**
   * Retrieves a saved baseline state for a client at a specific tick.
   */
  public getBaseline(sessionId: string, tick: number): any | null {
    const history = this.clientBaselines.get(sessionId);
    return history ? history[tick] || null : null;
  }

  /**
   * Clears saved baselines for a specific client session.
   */
  public clearClient(sessionId: string): void {
    this.clientBaselines.delete(sessionId);
  }

  /**
   * Clears all tracked baselines.
   */
  public clear(): void {
    this.clientBaselines.clear();
  }
}

/**
 * Tracks packet sequence numbers, last acknowledged ticks, and idle session times.
 * @public
 */
export class ClientAckTracker {
  private lastAckedSequences: Map<string, number> = new Map();
  private lastAckedTicks: Map<string, number> = new Map();
  private lastAckedTimes: Map<string, number> = new Map();
  private sequences: Map<string, number> = new Map();

  /**
   * Records an acknowledgment message from a client session.
   */
  public recordAck(sessionId: string, sequence: number, tick: number): void {
    this.lastAckedSequences.set(sessionId, sequence);
    this.lastAckedTicks.set(sessionId, tick);
    this.lastAckedTimes.set(sessionId, Date.now());
  }

  /**
   * Generates and tracks the next sequence number for a client update packet.
   */
  public nextSequence(sessionId: string): number {
    const seq = (this.sequences.get(sessionId) || 0) + 1;
    this.sequences.set(sessionId, seq);
    return seq;
  }

  /**
   * Returns the last acknowledged sequence number for a client session.
   */
  public getLastAckedSequence(sessionId: string): number {
    return this.lastAckedSequences.get(sessionId) || 0;
  }

  /**
   * Returns the last acknowledged tick number for a client session.
   */
  public getLastAckedTick(sessionId: string): number {
    return this.lastAckedTicks.get(sessionId) || 0;
  }

  /**
   * Returns the elapsed idle time in milliseconds since the last client ACK.
   */
  public getIdleTime(sessionId: string): number {
    const lastTime = this.lastAckedTimes.get(sessionId);
    return lastTime ? Date.now() - lastTime : 0;
  }

  /**
   * Clears tracked ack data for a specific client session.
   */
  public clearClient(sessionId: string): void {
    this.lastAckedSequences.delete(sessionId);
    this.lastAckedTicks.delete(sessionId);
    this.lastAckedTimes.delete(sessionId);
    this.sequences.delete(sessionId);
  }
}

/**
 * Generates delta snapshot updates for client sessions by comparing current
 * simulation snapshots against client-acknowledged baselines.
 * @public
 */
export class NetworkDeltaSystem<
  TComponents extends ComponentRegistry = ComponentRegistry,
  TEvents extends EventRegistry = EventRegistry
> {
  constructor(private tracker: ReplicationStateTracker) {}

  /**
   * Generates a comparative delta update payload for a client.
   * If no baseline is available, falls back gracefully to a full update.
   */
  public generateDelta(
    world: World<TComponents, TEvents>,
    sessionId: string,
    sequence: number,
    baselineAck: number,
    interestIds: Set<number>,
    forceFull: boolean
  ): ServerUpdatePayload {
    const currentSnapshot = world.snapshot();

    if (forceFull || baselineAck <= 0) {
      // Generate full snapshot filtered by interest
      const filteredComponentData: Record<string, any> = {};
      const componentData = (currentSnapshot as any).componentData || {};

      for (const [compType, entitiesMap] of Object.entries(componentData)) {
        const filteredMap: Record<number, any> = {};
        for (const id of interestIds) {
          if ((entitiesMap as any)[id] !== undefined) {
            filteredMap[id] = (entitiesMap as any)[id];
          }
        }
        if (Object.keys(filteredMap).length > 0) {
          filteredComponentData[compType] = filteredMap;
        }
      }

      return {
        kind: "full",
        serverTick: currentSnapshot.tick,
        fullWorldState: {
          ...currentSnapshot,
          entities: Array.from(interestIds),
          componentData: filteredComponentData
        } as unknown as WorldSnapshot
      };
    }

    const baseline = this.tracker.getBaseline(sessionId, baselineAck);
    if (!baseline) {
      // Fall back to full filtered snapshot if baseline is missing
      const filteredComponentData: Record<string, any> = {};
      const componentData = (currentSnapshot as any).componentData || {};

      for (const [compType, entitiesMap] of Object.entries(componentData)) {
        const filteredMap: Record<number, any> = {};
        for (const id of interestIds) {
          if ((entitiesMap as any)[id] !== undefined) {
            filteredMap[id] = (entitiesMap as any)[id];
          }
        }
        if (Object.keys(filteredMap).length > 0) {
          filteredComponentData[compType] = filteredMap;
        }
      }

      return {
        kind: "full",
        serverTick: currentSnapshot.tick,
        fullWorldState: {
          ...currentSnapshot,
          entities: Array.from(interestIds),
          componentData: filteredComponentData
        } as unknown as WorldSnapshot
      };
    }

    // Generate real, functional delta diff over componentData
    const deltaComponentData: Record<string, any> = {};
    const currentComponentData = (currentSnapshot as any).componentData || {};
    const baselineComponentData = (baseline as any).componentData || {};

    const allCompTypes = new Set([
      ...Object.keys(currentComponentData),
      ...Object.keys(baselineComponentData)
    ]);

    for (const compType of allCompTypes) {
      const currentMap = currentComponentData[compType] || {};
      const baselineMap = baselineComponentData[compType] || {};
      const diffMap: Record<number, any> = {};
      let hasChanges = false;

      for (const id of interestIds) {
        const currentVal = currentMap[id];
        const baselineVal = baselineMap[id];

        if (currentVal === undefined && baselineVal !== undefined) {
          // Component was removed
          diffMap[id] = null;
          hasChanges = true;
        } else if (currentVal !== undefined && baselineVal === undefined) {
          // Component was newly added
          diffMap[id] = currentVal;
          hasChanges = true;
        } else if (currentVal !== undefined && baselineVal !== undefined) {
          // Both have it: compare properties
          if (JSON.stringify(currentVal) !== JSON.stringify(baselineVal)) {
            diffMap[id] = currentVal;
            hasChanges = true;
          }
        }
      }

      if (hasChanges) {
        deltaComponentData[compType] = diffMap;
      }
    }

    return {
      kind: "delta",
      tick: currentSnapshot.tick,
      delta: {
        tick: currentSnapshot.tick,
        componentData: deltaComponentData
      } as unknown as Partial<WorldSnapshot>
    };
  }
}

/**
 * Manages network byte budget and restricts update sizes using priority weights.
 * @public
 */
export class NetworkBudgetManager {
  /**
   * Prioritizes interest items and clamps them to fit under a maximum budget.
   */
  public prioritize(sessionId: string, interest: any[], selfEntityId?: string, maxCount = 100): any[] {
    if (interest.length <= maxCount) {
      return interest;
    }

    const prioritized = [...interest].sort((a, b) => {
      // Elevate the client's own player entity to absolute highest priority
      if (selfEntityId) {
        if (String(a.id) === String(selfEntityId)) return -1;
        if (String(b.id) === String(selfEntityId)) return 1;
      }
      // Proximity-based priority
      const distA = a.distance ?? 9999;
      const distB = b.distance ?? 9999;
      return distA - distB;
    });

    return prioritized.slice(0, maxCount);
  }
}

/**
 * Handles binary serialization and msgpack compression.
 * @public
 */
export class BinaryCompression {
    public static pack(packet: any): Uint8Array {
        return packr.pack(packet);
    }
    public static unpack<T = any>(packet: Uint8Array | ArrayBuffer | Buffer): T {
        const buf = packet instanceof Uint8Array ? packet : new Uint8Array(packet);
        return packr.unpack(buf) as T;
    }
}

/**
 * System that calculates Areas of Interest (AOI) per client dynamically using proximity checks.
 * @public
 */
export class InterestManagerSystem<
  TComponents extends ComponentRegistry = ComponentRegistry,
  TEvents extends EventRegistry = EventRegistry
> extends System<TComponents, TEvents> {
  private clientInterests: Map<string, Set<number>> = new Map();

  /**
   * Evaluates proximity from client players to active entities to populate interests.
   */
  public update(world: World<TComponents, TEvents>, deltaTime: number): void {
    const allEntities = world.query();
    const clients = Array.from(this.clientInterests.keys());

    for (const sessionId of clients) {
      const interests = new Set<number>();

      let playerPos: { x: number; y: number } | null = null;
      const players = world.query("Transform" as any, "Player" as any);
      for (const p of players) {
        const owner = (world.getComponent(p, "Player" as any) as any)?.ownerSessionId;
        if (owner === sessionId) {
          const trans = world.getComponent(p, "Transform" as any) as any;
          if (trans) {
            playerPos = { x: trans.x, y: trans.y };
          }
          break;
        }
      }

      for (const entity of allEntities) {
        if (playerPos) {
          const trans = world.getComponent(entity, "Transform" as any) as any;
          if (trans) {
            // Check proximity within standard 600px radius
            const dx = trans.x - playerPos.x;
            const dy = trans.y - playerPos.y;
            const distSq = dx * dx + dy * dy;
            if (distSq <= 600 * 600) {
              interests.add(entity);
            }
            continue;
          }
        }
        // Fallback: include entity by default
        interests.add(entity);
      }

      this.clientInterests.set(sessionId, interests);
    }
  }

  /**
   * Returns the current interest set of a client session.
   */
  public getClientInterest(sessionId: string): Set<number> {
    return this.clientInterests.get(sessionId) || new Set();
  }

  /**
   * Registers a client session for interest tracking.
   */
  public registerClient(sessionId: string): void {
    this.clientInterests.set(sessionId, new Set());
  }

  /**
   * Unregisters a client session.
   */
  public unregisterClient(sessionId: string): void {
    this.clientInterests.delete(sessionId);
  }

  public override onRegister(world: World<TComponents, TEvents>): void {}
  public override dispose(): void {
    this.clientInterests.clear();
  }
}
