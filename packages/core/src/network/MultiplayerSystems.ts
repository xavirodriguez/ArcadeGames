import { Packr } from "msgpackr";
import { ServerUpdatePayload } from "./NetTypes";
import { WorldSnapshot, filterSoASnapshot } from "../snapshots/WorldSnapshot";
import { World } from "../ecs/World";
import { System } from "../ecs/System";
import { ComponentRegistry } from "../ecs/Component";
import { EventRegistry } from "../events/EventBus";

const packr = new Packr({
    useRecords: false,
    structuredClone: true
});

/** @public */
export class ReplicationStateTracker {
  private sessions = new Map<string, Map<number, { stateVersion: number; structureVersion: number }>>();

  public recordSent(
    sessionId: string,
    sequence: number,
    stateVersion: number,
    structureVersion: number
  ): void {
    let sessionMap = this.sessions.get(sessionId);
    if (!sessionMap) {
      sessionMap = new Map();
      this.sessions.set(sessionId, sessionMap);
    }
    sessionMap.set(sequence, { stateVersion, structureVersion });
  }

  public getBaselineVersion(
    sessionId: string,
    ack: number
  ): { stateVersion: number; structureVersion: number } | undefined {
    if (ack <= 0) return undefined;
    const sessionMap = this.sessions.get(sessionId);
    return sessionMap?.get(ack);
  }

  public prune(sessionId: string, ack: number): void {
    if (ack <= 0) return;
    const sessionMap = this.sessions.get(sessionId);
    if (!sessionMap) return;

    for (const sequence of sessionMap.keys()) {
      if (sequence < ack) {
        sessionMap.delete(sequence);
      }
    }
  }
}
/** @public */
export class ClientAckTracker {
  private sessions = new Map<string, { lastAck: number; currentSeq: number; lastActive: number }>();

  private getOrCreate(sessionId: string) {
    let entry = this.sessions.get(sessionId);
    if (!entry) {
      entry = { lastAck: 0, currentSeq: 0, lastActive: 0 };
      this.sessions.set(sessionId, entry);
    }
    return entry;
  }

  public recordAck(sessionId: string, sequence: number, _tick: number): void {
    const entry = this.getOrCreate(sessionId);
    if (sequence > entry.lastAck) {
      entry.lastAck = sequence;
    }
    entry.lastActive = Date.now();
  }

  public nextSequence(sessionId: string): number {
    const entry = this.getOrCreate(sessionId);
    entry.currentSeq += 1;
    return entry.currentSeq;
  }

  public getLastAckedSequence(sessionId: string): number {
    const entry = this.sessions.get(sessionId);
    return entry ? entry.lastAck : 0;
  }

  public getIdleTime(sessionId: string): number {
    const entry = this.sessions.get(sessionId);
    if (!entry || entry.lastActive === 0) {
      return 99999999;
    }
    return Date.now() - entry.lastActive;
  }
}
/** @public */
export class NetworkDeltaSystem<
  TComponents extends ComponentRegistry = ComponentRegistry,
  TEvents extends EventRegistry = EventRegistry
> {
  constructor(private tracker: ReplicationStateTracker) {}

  public generateDelta(
    world: World<TComponents, TEvents>,
    sessionId: string,
    sequence: number,
    baselineAck: number,
    interestIds: Set<number>,
    forceFull: boolean
  ): ServerUpdatePayload {
    if (!world || typeof world.snapshot !== "function") {
      return { kind: "delta", tick: 0, delta: {} };
    }

    const baseline = this.tracker.getBaselineVersion(sessionId, baselineAck);
    const mustSendFull =
      forceFull ||
      baseline === undefined ||
      baseline.structureVersion !== world.structureVersion;

    let payload: ServerUpdatePayload;

    if (mustSendFull) {
      const fullSnap = world.snapshot();
      let filteredSnap: WorldSnapshot;

      if (fullSnap.isSoA) {
        filteredSnap = filterSoASnapshot(fullSnap, interestIds);
      } else {
        const filteredEntities = fullSnap.entities.filter((id) => interestIds.has(id));
        const filteredComponentData: Record<string, Record<number, any>> = {};

        if (fullSnap.componentData) {
          for (const type in fullSnap.componentData) {
            filteredComponentData[type] = {};
            const entityMap = fullSnap.componentData[type];
            for (const entityIdStr in entityMap) {
              const entityId = Number(entityIdStr);
              if (interestIds.has(entityId)) {
                filteredComponentData[type][entityId] = entityMap[entityId];
              }
            }
          }
        }

        filteredSnap = {
          ...fullSnap,
          entities: filteredEntities,
          componentData: filteredComponentData,
        };
      }

      payload = {
        kind: "full",
        serverTick: world.tick,
        fullWorldState: filteredSnap,
      };
    } else {
      const deltaResult = world.deltaSnapshot(baseline.stateVersion);

      if (deltaResult.componentData) {
        for (const type in deltaResult.componentData) {
          const entityMap = deltaResult.componentData[type];
          for (const entityIdStr in entityMap) {
            const entityId = Number(entityIdStr);
            if (!interestIds.has(entityId)) {
              delete entityMap[entityId];
            }
          }
        }
      }

      payload = {
        kind: "delta",
        tick: world.tick,
        delta: {
          ...deltaResult,
          entities: Array.from(interestIds),
        },
      };
    }

    this.tracker.recordSent(
      sessionId,
      sequence,
      world.stateVersion,
      world.structureVersion
    );
    this.tracker.prune(sessionId, baselineAck);

    return payload;
  }
}
/**
 * Maximum number of entities replicated per tick to a client.
 *
 * @remarks
 * Prioritization policy:
 * - The player's own entity (`selfEntityId`) is always prioritized first.
 * - 20% of the quota (at least 1 entity) is reserved for distant "tail" entities,
 *   selected round-robin via a rotating per-session cursor to guarantee long-term updates.
 * - The remaining quota is allocated to the nearest entities ordered by Euclidean distance ascending.
 * - Output is truncated to at most `MAX_ENTITIES_PER_TICK` entities.
 * @public
 */
export const MAX_ENTITIES_PER_TICK = 20;

/** @public */
export class NetworkBudgetManager {
  private cursors = new Map<string, number>();

  public prioritize<T = unknown>(sessionId: string, interest: T[], selfEntityId?: string): T[] {
    if (!interest || interest.length === 0) {
      return [];
    }
    if (interest.length === 1 && (!selfEntityId || (interest[0] as any)?.entityId?.toString() === selfEntityId)) {
      return interest;
    }

    if (interest.length <= MAX_ENTITIES_PER_TICK) {
      const sorted = [...interest].sort((a, b) => {
        const idA = (a as any)?.entityId?.toString();
        const idB = (b as any)?.entityId?.toString();
        if (selfEntityId) {
          if (idA === selfEntityId) return -1;
          if (idB === selfEntityId) return 1;
        }
        const distA = typeof (a as any)?.distance === "number" ? (a as any).distance : Infinity;
        const distB = typeof (b as any)?.distance === "number" ? (b as any).distance : Infinity;
        return distA - distB;
      });
      return sorted;
    }

    let selfItem: T | undefined;
    const otherItems: T[] = [];

    for (let i = 0; i < interest.length; i++) {
      const item = interest[i];
      const id = (item as any)?.entityId?.toString();
      if (selfEntityId && id === selfEntityId && !selfItem) {
        selfItem = item;
      } else {
        otherItems.push(item);
      }
    }

    otherItems.sort((a, b) => {
      const distA = typeof (a as any)?.distance === "number" ? (a as any).distance : Infinity;
      const distB = typeof (b as any)?.distance === "number" ? (b as any).distance : Infinity;
      return distA - distB;
    });

    const farQuota = Math.max(1, Math.floor(MAX_ENTITIES_PER_TICK * 0.2));
    const availableSlots = MAX_ENTITIES_PER_TICK - (selfItem ? 1 : 0);
    const nearQuota = Math.max(0, availableSlots - farQuota);

    const nearItems = otherItems.slice(0, nearQuota);
    const farCandidates = otherItems.slice(nearQuota);

    const farItems: T[] = [];
    if (farCandidates.length > 0) {
      const cursor = this.cursors.get(sessionId) ?? 0;
      const countToSelect = Math.min(farQuota, farCandidates.length);

      for (let i = 0; i < countToSelect; i++) {
        const idx = (cursor + i) % farCandidates.length;
        farItems.push(farCandidates[idx]);
      }

      this.cursors.set(sessionId, (cursor + countToSelect) % farCandidates.length);
    }

    const result: T[] = [];
    if (selfItem) {
      result.push(selfItem);
    }
    result.push(...nearItems, ...farItems);

    return result.slice(0, MAX_ENTITIES_PER_TICK);
  }
}
/** @public */
export class BinaryCompression {
    public static pack(packet: unknown): Uint8Array {
        return packr.pack(packet);
    }
    public static unpack<T = unknown>(packet: Uint8Array | ArrayBuffer | Buffer): T {
        const buf = packet instanceof Uint8Array ? packet : new Uint8Array(packet);
        return packr.unpack(buf) as T;
    }
}

/** @public */
export class InterestManagerSystem<
  TComponents extends ComponentRegistry = ComponentRegistry,
  TEvents extends EventRegistry = EventRegistry
> extends System<TComponents, TEvents> {
  private worldRef?: World<TComponents, TEvents>;

  public override onRegister(world: World<TComponents, TEvents>): void {
    this.worldRef = world;
    if (world && typeof world.getResource === "function" && !world.getResource("DetailedInterestMap")) {
      world.setResource(
        "DetailedInterestMap",
        new Map<string, Array<{ entityId: string; distance?: number }>>()
      );
    }
  }

  public update(world: World<TComponents, TEvents>, _deltaTime: number): void {
    if (!world || typeof world.getResource !== "function") return;
    let map = world.getResource<Map<string, Array<{ entityId: string; distance?: number }>>>("DetailedInterestMap");
    if (!map) {
      map = new Map<string, Array<{ entityId: string; distance?: number }>>();
      world.setResource("DetailedInterestMap", map);
    }
    map.clear();

    const allEntities = world.entities;

    for (let i = 0; i < allEntities.length; i++) {
      const playerEntity = allEntities[i];

      let playerSessionId: string | undefined;
      const compTypes = world.getEntityComponentTypes(playerEntity);
      for (const type of compTypes) {
        const comp = world.getComponent(playerEntity, type as any) as Record<string, unknown> | undefined;
        if (comp && typeof comp.sessionId === "string") {
          playerSessionId = comp.sessionId;
          break;
        }
      }

      if (!playerSessionId) continue;

      const playerTransform = world.getComponent(playerEntity, "Transform" as any) as { x?: number; y?: number } | undefined;
      const px = playerTransform?.x ?? 0;
      const py = playerTransform?.y ?? 0;

      const interestList: Array<{ entityId: string; distance: number }> = [];

      for (let j = 0; j < allEntities.length; j++) {
        const targetEntity = allEntities[j];
        const targetTransform = world.getComponent(targetEntity, "Transform" as any) as { x?: number; y?: number } | undefined;

        if (targetTransform && typeof targetTransform.x === "number" && typeof targetTransform.y === "number") {
          const dx = targetTransform.x - px;
          const dy = targetTransform.y - py;
          const dist = Math.hypot(dx, dy);
          interestList.push({ entityId: targetEntity.toString(), distance: dist });
        }
      }

      map.set(playerSessionId, interestList);
    }
  }

  public override dispose(): void {
    if (this.worldRef && typeof this.worldRef.deleteResource === "function") {
      this.worldRef.deleteResource("DetailedInterestMap");
    }
    this.worldRef = undefined;
  }
}
