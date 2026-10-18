import { World, Entity, EntitySyncDescriptor, InterpolationSnapshotEntry, NetworkManager, ComponentRegistry, EventRegistry, BlueprintRegistryMap, applyServerState } from "@tiny-aster/core";

/**
 * Ensures an entity carries a LocalPlayer component in network sync descriptors.
 * @param world - World instance.
 * @param entity - Entity ID.
 * @public
 */
/**
 * Queries the active world for the primary Player entity.
 * @param world - World instance.
 * @returns Player entity ID or undefined if not found.
 * @public
 */
export function queryPlayerEntity(world: World): Entity | undefined {
  return world.query("Player")[0] ?? world.query("LocalPlayer")[0];
}

export function markLocalPlayerEntity(world: World, entity: Entity): void {
  const commands = world.getCommandBuffer();
  if (!world.hasComponent(entity, "LocalPlayer" as never)) {
    commands.addComponent(entity, { type: "LocalPlayer" } as never);
  }
}

/**
 * Reusable no-op synchronization handler for entity sync descriptors.
 * @public
 */
export const NO_OP_SYNC = (): void => {};

/**
 * Standardized score / game status mutation payload received from server snapshots.
 * @public
 */
export interface ServerGameStateFields {
  score?: number | string;
  gameOver?: boolean;
  wave?: number | string;
  bombs?: number | string;
  lives?: number | string;
}

/**
 * Mutates common game state singleton fields from server snapshot payload.
 * @param state - Mutated state object.
 * @param fields - Server payload containing state fields.
 * @public
 */
export function applyServerGameStateFields<T extends object>(
  state: T,
  fields: ServerGameStateFields
): void {
  const target = state as Record<string, unknown>;
  if (fields.score !== undefined) {
    target.score = Number(fields.score);
  }
  if (fields.gameOver !== undefined) {
    target.isGameOver = !!fields.gameOver;
  }
  if (fields.wave !== undefined) {
    target.wave = Number(fields.wave);
  }
  if (fields.bombs !== undefined) {
    target.bombs = Number(fields.bombs);
  }
  if (fields.lives !== undefined) {
    target.lives = Number(fields.lives);
  }
}

/**
 * Helper collecting interpolation snapshot entries for entity groups in server state payloads.
 * @public
 */
export function collectGroupInterpolationEntries(
  groupObj: Record<string, { x: number; y: number; angle?: number; rotation?: number; alive?: boolean }> | undefined,
  prefix: string,
  replicator: { getLocalId(serverId: string): number | undefined },
  requireAlive = false
): Array<{ entityId: number; x: number; y: number; rotation?: number }> {
  const entries: Array<{ entityId: number; x: number; y: number; rotation?: number }> = [];
  if (groupObj && typeof groupObj === "object") {
    Object.entries(groupObj).forEach(([id, p]) => {
      if (!p) return;
      if (requireAlive && p.alive === false) return;
      const entityId = replicator.getLocalId(`${prefix}_${id}`);
      if (entityId !== undefined) {
        const rotation = p.rotation ?? p.angle;
        entries.push(rotation !== undefined ? { entityId, x: p.x, y: p.y, rotation } : { entityId, x: p.x, y: p.y });
      }
    });
  }
  return entries;
}

/**
 * Group descriptor configuration for applyServerSnapshot.
 * @public
 */
export interface ServerSnapshotGroupConfig {
  stateKey: string;
  prefix: string;
  requireAlive?: boolean;
}

/**
 * Options configuration for applyServerSnapshot.
 * @public
 */
export interface ApplyServerSnapshotOptions<
  TRegistry extends ComponentRegistry = ComponentRegistry,
  TEventRegistry extends EventRegistry = EventRegistry,
  TBlueprintMap extends BlueprintRegistryMap<TRegistry> = BlueprintRegistryMap<TRegistry>
> {
  gameStateSingletonKey?: string;
  descriptors: EntitySyncDescriptor<Record<string, unknown>, unknown, TRegistry, TEventRegistry, TBlueprintMap>[];
  groups: ServerSnapshotGroupConfig[];
  localSessionId?: string;
}

/**
 * Orchestrates global GameState mutation, entity interpolation entries collection,
 * and entity sync application for incoming server state snapshots.
 * @public
 */
export function applyServerSnapshot<
  TRegistry extends ComponentRegistry = ComponentRegistry,
  TEventRegistry extends EventRegistry = EventRegistry,
  TBlueprintMap extends BlueprintRegistryMap<TRegistry> = BlueprintRegistryMap<TRegistry>
>(
  world: World<TRegistry>,
  networkManager: NetworkManager<TRegistry>,
  state: Record<string, unknown>,
  options: ApplyServerSnapshotOptions<TRegistry, TEventRegistry, TBlueprintMap>
): void {
  if (!state) return;

  if (options.gameStateSingletonKey) {
    const key = options.gameStateSingletonKey as Extract<keyof TRegistry, string>;
    const gs = world.getSingleton(key);
    if (gs && typeof gs === "object") {
      world.mutateSingleton(key, (currentGs) => {
        if (currentGs && typeof currentGs === "object") {
          applyServerGameStateFields(currentGs, state);
        }
      });
    }
  }

  const replicator = networkManager.getReplicator();
  const entries: InterpolationSnapshotEntry[] = [];

  for (let i = 0; i < options.groups.length; i++) {
    const groupCfg = options.groups[i];
    const groupObj = state[groupCfg.stateKey] as Record<string, { x: number; y: number; angle?: number; rotation?: number; alive?: boolean }> | undefined;
    if (groupObj) {
      const groupEntries = collectGroupInterpolationEntries(
        groupObj,
        groupCfg.prefix,
        replicator,
        groupCfg.requireAlive ?? false
      );
      for (let j = 0; j < groupEntries.length; j++) {
        entries.push(groupEntries[j]);
      }
    }
  }

  applyServerState(
    world,
    networkManager,
    options.descriptors,
    state,
    entries,
    options.localSessionId
  );
}
