import { World, ComponentRegistry, BlueprintRegistryMap } from "../ecs/World";
import { IStateReplicator, WorldLike, NetworkManager } from "./NetworkManager";
import { pruneStaleEntities } from "./pruneStaleEntities";
import { buildInterpolationSnapshot, InterpolationSnapshotEntry } from "./interpolationSnapshot";

/**
 * Local player synchronization policy during network updates.
 * - `"skip"`: Skip Transform synchronization and component spawning for the local player entity.
 * - `"mark"`: Synchronize entity and invoke `onLocalPlayerMark` hook to attach local player components.
 * - `"none"`: Do not distinguish local player from remote entities.
 * @public
 */
export type LocalPlayerSyncPolicy = "skip" | "mark" | "none";

/**
 * Interface describing network synchronization rules and lifecycle handlers for an entity type.
 *
 * @typeParam TServerState - Raw server state map representation for this entity collection.
 * @typeParam TItemState - Individual entity server state object format.
 * @typeParam TComponents - World component registry type.
 * @typeParam TEvents - Event registry type.
 * @typeParam TBlueprints - Blueprint registry map type.
 * @public
 */
export interface EntitySyncDescriptor<
  TServerState = Record<string, unknown>,
  TItemState = unknown,
  TComponents extends ComponentRegistry = ComponentRegistry,
  TEvents extends Record<string, unknown> = Record<string, unknown>,
  TBlueprints extends BlueprintRegistryMap<TComponents> = BlueprintRegistryMap<TComponents>
> {
  /** Server ID string prefix used to construct network server IDs (e.g., `"player"`, `"enemy"`, `"bullet"`). */
  serverIdPrefix: string;
  /** Extracts state map object from root server state payload. */
  getStateMap: (root: TServerState) => Record<string, TItemState> | undefined;
  /**
   * Spawns or initializes initial entity components when entity is first resolved on client.
   * If a blueprint is registered in `blueprints`, this can delegate to `blueprints.get(...)?.spawn(...)`.
   */
  spawn: (
    world: World<TComponents, TEvents, TBlueprints>,
    entity: number,
    state: TItemState,
    key: string
  ) => void;
  /** Performs per-tick mutations or component updates on resolved entity. */
  sync: (
    world: World<TComponents, TEvents, TBlueprints>,
    entity: number,
    state: TItemState,
    key: string
  ) => void;
  /** Local player synchronization behavior policy. Defaults to `"none"`. */
  localPlayerPolicy?: LocalPlayerSyncPolicy;
  /**
   * Optional hook invoked when `localPlayerPolicy` is `"mark"` and current entity matches `localSessionId`.
   */
  onLocalPlayerMark?: (
    world: World<TComponents, TEvents, TBlueprints>,
    entity: number
  ) => void;
}

/**
 * Generic, game-agnostic entity sync engine.
 * Iterates through server state map, resolves entity ID via replicator, spawns initial components on first frame,
 * applies sync mutations per tick, handles local player policies, and tracks active server IDs for stale pruning.
 *
 * @param world - ECS world instance.
 * @param replicator - Network state replicator instance.
 * @param descriptor - Entity sync descriptor rule object.
 * @param rootState - Root network payload received from server.
 * @param currentServerEntities - Set tracking active server entity IDs in current tick.
 * @param localSessionId - Optional session ID of the local client player.
 * @public
 */
export function syncEntitiesFromServer<
  TServerState = Record<string, unknown>,
  TItemState = unknown,
  TComponents extends ComponentRegistry = ComponentRegistry,
  TEvents extends Record<string, unknown> = Record<string, unknown>,
  TBlueprints extends BlueprintRegistryMap<TComponents> = BlueprintRegistryMap<TComponents>
>(
  world: World<TComponents, TEvents, TBlueprints>,
  replicator: IStateReplicator<TComponents>,
  descriptor: EntitySyncDescriptor<TServerState, TItemState, TComponents, TEvents, TBlueprints>,
  rootState: TServerState,
  currentServerEntities: Set<string>,
  localSessionId?: string
): void {
  const stateMap = descriptor.getStateMap(rootState);
  if (!stateMap || typeof stateMap !== "object") return;

  const policy = descriptor.localPlayerPolicy ?? "none";
  const transformKey = "Transform" as Extract<keyof TComponents, string>;

  Object.entries(stateMap).forEach(([key, itemState]) => {
    if (!itemState) return;

    const serverId = `${descriptor.serverIdPrefix}_${key}`;
    currentServerEntities.add(serverId);

    // Local player "skip" policy
    if (policy === "skip" && localSessionId && key === localSessionId) {
      return;
    }

    const entity = replicator.resolveEntity(serverId, world as WorldLike<TComponents>);
    const isFirstTime = !world.hasComponent(entity, transformKey);

    if (isFirstTime) {
      descriptor.spawn(world, entity, itemState, key);
    }

    // Local player "mark" policy
    if (policy === "mark" && localSessionId && key === localSessionId) {
      if (descriptor.onLocalPlayerMark) {
        descriptor.onLocalPlayerMark(world, entity);
      }
    }

    descriptor.sync(world, entity, itemState, key);
  });
}

/**
 * Generic server state application helper for multiplayer games.
 * Synchronizes entities via sync descriptors, builds an interpolation snapshot,
 * passes the update to networkManager, prunes stale entities, and flushes the world buffer if not updating.
 *
 * @param world - ECS world instance.
 * @param networkManager - Network manager handling replication and interpolation.
 * @param descriptors - Array of entity synchronization descriptors.
 * @param state - Raw server state payload.
 * @param entries - Array of interpolation snapshot entries for this frame.
 * @param localSessionId - Optional session ID of the local client player.
 * @public
 */
export function applyServerState<
  TComponents extends ComponentRegistry = ComponentRegistry,
  TEvents extends Record<string, unknown> = Record<string, unknown>,
  TBlueprints extends BlueprintRegistryMap<TComponents> = BlueprintRegistryMap<TComponents>
>(
  world: World<TComponents, TEvents, TBlueprints>,
  networkManager: NetworkManager<TComponents>,
  descriptors: EntitySyncDescriptor<Record<string, unknown>, unknown, TComponents, any, any>[],
  state: Record<string, unknown>,
  entries: InterpolationSnapshotEntry[],
  localSessionId?: string
): void {
  const replicator = networkManager.getReplicator();
  const currentServerEntities = new Set<string>();

  descriptors.forEach((descriptor) => {
    syncEntitiesFromServer(world, replicator, descriptor, state, currentServerEntities, localSessionId);
  });

  const snapshot = buildInterpolationSnapshot((state.tick as number) || 0, entries);
  networkManager.processServerUpdate(snapshot.tick, snapshot, localSessionId);

  pruneStaleEntities(replicator, currentServerEntities, world.getCommandBuffer());

  if (!world.isUpdating) {
    world.flush();
  }
}
