import { World, ComponentRegistry } from "../ecs/World";
import { IStateReplicator, WorldLike } from "./NetworkManager";

/**
 * Local player synchronization policy during network updates.
 * - `"skip"`: Skip Transform synchronization and component spawning for the local player entity.
 * - `"mark"`: Synchronize entity and attach `LocalPlayer` and default `Input` components.
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
 * @public
 */
export interface EntitySyncDescriptor<
  TServerState = Record<string, unknown>,
  TItemState = unknown,
  TComponents extends ComponentRegistry = ComponentRegistry
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
    world: World<TComponents, any, any>,
    entity: number,
    state: TItemState,
    key: string
  ) => void;
  /** Performs per-tick mutations or component updates on resolved entity. */
  sync: (
    world: World<TComponents, any, any>,
    entity: number,
    state: TItemState,
    key: string
  ) => void;
  /** Local player synchronization behavior policy. Defaults to `"none"`. */
  localPlayerPolicy?: LocalPlayerSyncPolicy;
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
  TComponents extends ComponentRegistry = ComponentRegistry
>(
  world: World<TComponents, any, any>,
  replicator: IStateReplicator<TComponents>,
  descriptor: EntitySyncDescriptor<TServerState, TItemState, TComponents>,
  rootState: TServerState,
  currentServerEntities: Set<string>,
  localSessionId?: string
): void {
  const stateMap = descriptor.getStateMap(rootState);
  if (!stateMap || typeof stateMap !== "object") return;

  const policy = descriptor.localPlayerPolicy ?? "none";
  const commands = world.getCommandBuffer();

  Object.entries(stateMap).forEach(([key, itemState]) => {
    if (!itemState) return;

    const serverId = `${descriptor.serverIdPrefix}_${key}`;
    currentServerEntities.add(serverId);

    // Local player "skip" policy
    if (policy === "skip" && localSessionId && key === localSessionId) {
      return;
    }

    const entity = replicator.resolveEntity(serverId, world as unknown as WorldLike<TComponents>);
    const isFirstTime = !world.hasComponent(entity, "Transform" as any);

    if (isFirstTime) {
      descriptor.spawn(world, entity, itemState, key);
    }

    // Local player "mark" policy
    if (policy === "mark" && localSessionId && key === localSessionId) {
      if (!world.hasComponent(entity, "LocalPlayer" as any)) {
        commands.addComponent(entity, { type: "LocalPlayer" } as any);
      }
      if (!world.hasComponent(entity, "Input" as any)) {
        commands.addComponent(entity, {
          type: "Input",
          actions: new Set<string>(),
          axes: {},
          moveLeft: false,
          moveRight: false,
          shoot: false,
          shootCooldownRemaining: 0,
        } as any);
      }
    }

    descriptor.sync(world, entity, itemState, key);
  });
}
