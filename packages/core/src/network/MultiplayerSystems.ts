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

/**  
 * Server-side tracker of what state version/structure version was last sent to  
 * each client session at each sequence number. Used by `NetworkDeltaSystem` to  
 * decide whether a client's acked baseline is still valid for a delta, or  
 * whether a full snapshot must be resent (e.g. after a structural change the  
 * client never acked).  
 * @public  
 */  
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

    /**  
   * @returns The recorded state/structure versions sent at `ack`, or `undefined`  
   * if `ack <= 0` (no baseline yet) or nothing was recorded for that sequence  
   * (e.g. already pruned).  
   */  
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
/**  
 * Server-side tracker of per-session input-sequence acknowledgement and  
 * activity, independent of `ReplicationStateTracker` (that one tracks *what  
 * was sent*; this one tracks *what the client confirmed receiving* and *when  
 * it was last active*, used for idle/timeout detection).  
 * @public  
 */  
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
  /**  
   * Records an ack for `sequence`. Out-of-order/duplicate acks (lower than the  
   * current `lastAck`) are ignored — `lastAck` only ever increases.  
   * `_tick` is currently unused; kept for call-site symmetry/future use.  
   */  
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
/**  
 * Builds the actual `ServerUpdatePayload` sent to a client each tick: either a  
 * filtered full snapshot or a filtered delta, depending on whether the  
 * client's last acked baseline is still valid.  
 *  
 * @remarks  
 * A full snapshot is forced when: the caller requests it (`forceFull`), there  
 * is no baseline yet for this session, or the world's `structureVersion` has  
 * changed since the baseline (structural changes — e.g. entities added/removed  
 * in a way delta can't express — always require a full resync).  
 * Both snapshot forms are filtered down to `interestIds` before sending, so  
 * bandwidth scales with each client's interest set, not total world size (see  
 * `InterestManagerSystem`/`NetworkBudgetManager` for how `interestIds` gets built).  
 * @public  
 */  
export class NetworkDeltaSystem<
  TComponents extends ComponentRegistry = ComponentRegistry,
  TEvents extends EventRegistry = EventRegistry
> {
  constructor(private tracker: ReplicationStateTracker) {}
  /**  
   * @param sessionId - Target client session.  
   * @param sequence - Outgoing sequence number for this payload (see `ClientAckTracker.nextSequence`).  
   * @param baselineAck - Last sequence number the client acked; used to look up the delta baseline.  
   * @param interestIds - Entities this client is currently allowed to see (post-budget-filter).  
   * @param forceFull - Bypasses delta logic and always sends a full snapshot.  
   */  
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

interface InterestItem {
  entityId?: string | number;
  distance?: number;
}

function getItemEntityId(item: unknown): string | undefined {
  if (typeof item === "object" && item !== null && "entityId" in item) {
    const val = (item as InterestItem).entityId;
    return val !== undefined ? String(val) : undefined;
  }
  return undefined;
}

function getItemDistance(item: unknown): number {
  if (typeof item === "object" && item !== null && "distance" in item) {
    const val = (item as InterestItem).distance;
    if (typeof val === "number") return val;
  }
  return Infinity;
}

/**  
 * Selects which entities from a client's full interest list actually get  
 * replicated this tick, enforcing `MAX_ENTITIES_PER_TICK` as a bandwidth cap.  
 * See the `@remarks` on `MAX_ENTITIES_PER_TICK` for the prioritization policy  
 * (self first, then near entities, then a rotating slice of far entities).  
 * @public  
 */  
export class NetworkBudgetManager {
  private cursors = new Map<string, number>();
  /**  
   * @param sessionId - Used to persist the round-robin cursor for "far" entities  
   * across calls, so different far entities get a turn over successive ticks  
   * instead of always favoring the same ones.  
   * @param interest - Full candidate list for this client this tick, each item  
   * expected to (optionally) carry `entityId`/`distance`.  
   * @param selfEntityId - The client's own entity, if any — always included first.  
   * @returns At most `MAX_ENTITIES_PER_TICK` items, ordered self → near → far.  
   */  
  public prioritize<T = unknown>(sessionId: string, interest: T[], selfEntityId?: string): T[] {
    if (!interest || interest.length === 0) {
      return [];
    }
    if (interest.length === 1 && (!selfEntityId || getItemEntityId(interest[0]) === selfEntityId)) {
      return interest;
    }

    if (interest.length <= MAX_ENTITIES_PER_TICK) {
      const sorted = [...interest].sort((a, b) => {
        const idA = getItemEntityId(a);
        const idB = getItemEntityId(b);
        if (selfEntityId) {
          if (idA === selfEntityId) return -1;
          if (idB === selfEntityId) return 1;
        }
        return getItemDistance(a) - getItemDistance(b);
      });
      return sorted;
    }

    let selfItem: T | undefined;
    const otherItems: T[] = [];

    for (let i = 0; i < interest.length; i++) {
      const item = interest[i];
      const id = getItemEntityId(item);
      if (selfEntityId && id === selfEntityId && !selfItem) {
        selfItem = item;
      } else {
        otherItems.push(item);
      }
    }

    otherItems.sort((a, b) => getItemDistance(a) - getItemDistance(b));

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
/**  
 * Thin wrapper around `msgpackr` for binary (de)serialization of network  
 * payloads — used instead of JSON to reduce payload size over the wire.  
 * `useRecords: false` avoids msgpackr's schema-record optimization (simpler,  
 * more portable wire format at some size cost); `structuredClone: true` allows  
 * encoding richer JS structures (e.g. Map/Set) if payloads ever need them.  
 * @public  
 */  
export class BinaryCompression {
    public static pack(packet: unknown): Uint8Array {
        return packr.pack(packet);
    }
    public static unpack<T = unknown>(packet: Uint8Array | ArrayBuffer | Buffer): T {
        const buf = packet instanceof Uint8Array ? packet : new Uint8Array(packet);
        return packr.unpack(buf) as T;
    }
}

/**  
 * Server-side system that recomputes, once per tick, which entities are  
 * "interesting" (visible/relevant) to each connected player session, keyed by  
 * `sessionId`. Feeds `NetworkBudgetManager.prioritize()` and ultimately  
 * `NetworkDeltaSystem.generateDelta()`'s `interestIds` parameter.  
 *  
 * @remarks  
 * Interest here is purely Euclidean distance between each player's `Transform`  
 * and every other entity's `Transform` — an O(players × entities) full  
 * recompute every tick (see `.agents/devin_audit.md`'s "O(n^2) complexity"  
 * category if this ever needs spatial partitioning instead). Player identity  
 * is detected structurally by scanning for any component carrying a  
 * `sessionId` field, rather than a fixed component name — this is a broad,  
 * duck-typed check; confirm it's intentional before assuming a narrower  
 * component-type check would be safe to substitute.  
 * Registers/clears the `"DetailedInterestMap"` world resource on  
 * register/dispose respectively, so nothing leaks past this system's lifetime.  
 * @public  
 */  
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
        const comp = world.getComponent(playerEntity, type as Extract<keyof TComponents, string>);
        if (comp && typeof comp === "object" && "sessionId" in comp) {
          const sid = (comp as { sessionId?: string }).sessionId;
          if (typeof sid === "string") {
            playerSessionId = sid;
            break;
          }
        }
      }

      if (!playerSessionId) continue;

      const playerTransformComp = world.getComponent(playerEntity, "Transform" as Extract<keyof TComponents, string>);
      const px = (playerTransformComp && typeof playerTransformComp === "object" && "x" in playerTransformComp && typeof (playerTransformComp as { x?: number }).x === "number") ? (playerTransformComp as { x: number }).x : 0;
      const py = (playerTransformComp && typeof playerTransformComp === "object" && "y" in playerTransformComp && typeof (playerTransformComp as { y?: number }).y === "number") ? (playerTransformComp as { y: number }).y : 0;

      const interestList: Array<{ entityId: string; distance: number }> = [];

      for (let j = 0; j < allEntities.length; j++) {
        const targetEntity = allEntities[j];
        const targetTransformComp = world.getComponent(targetEntity, "Transform" as Extract<keyof TComponents, string>);

        if (targetTransformComp && typeof targetTransformComp === "object" && "x" in targetTransformComp && "y" in targetTransformComp) {
          const tx = (targetTransformComp as { x?: number }).x;
          const ty = (targetTransformComp as { y?: number }).y;
          if (typeof tx === "number" && typeof ty === "number") {
            const dx = tx - px;
            const dy = ty - py;
            const dist = Math.hypot(dx, dy);
            interestList.push({ entityId: targetEntity.toString(), distance: dist });
          }
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
