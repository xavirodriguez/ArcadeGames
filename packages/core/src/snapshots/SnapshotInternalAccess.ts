import type { World } from "../ecs/World";
import type { WorldSnapshot } from "./WorldSnapshot";
import type { ComponentRegistry } from "../ecs/Component";
import { Query } from "../ecs/Query";
import { ComponentStorage, MapStorage, SparseSetStorage } from "../ecs/storage";

/**
 * Internal access interface exposing World metadata and index properties for snapshot restoration.
 * @internal
 */
export interface InternalWorldAccess<TComponents extends ComponentRegistry = ComponentRegistry> {
  activeEntities: Set<number>;
  nextEntityId: number;
  freeEntities: number[];
  generations: number[];
  _structureVersion: number;
  _stateVersion: number;
  _tick: number;
  entityComponentSets: Map<number, Set<string>>;
  componentMaps: Map<string, ComponentStorage<unknown>>;
  componentIndex: Map<string, Set<number>>;
  componentVersions: Map<string, Map<number, number>>;
  queries: Query<TComponents>[];
  useSparseSetStorage?: boolean;
}

/**
 * Restores metadata, entity bookkeeping, and RNG state on the target world from a snapshot.
 * @internal
 */
export function restoreWorldMetadata<TComponents extends ComponentRegistry>(
  world: World<TComponents>,
  state: WorldSnapshot
): InternalWorldAccess<TComponents> {
  const internal = world.getSerializationView();

  internal.activeEntities = new Set(state.entities);
  internal.nextEntityId = state.nextEntityId;
  internal.freeEntities = [...state.freeEntities];
  internal.generations = state.generations ? Array.from(state.generations) : [];
  internal._structureVersion = state.structureVersion;
  internal._stateVersion = state.stateVersion;
  internal._tick = state.tick;
  internal.useSparseSetStorage = world.getResource("UseSparseSetStorage") === true;

  if (state.rngState !== undefined) {
    world.gameplayRandom.setSeed(state.rngState);
  } else if (state.seed !== undefined) {
    world.gameplayRandom.setSeed(state.seed);
  }

  internal.entityComponentSets.clear();
  internal.componentMaps.clear();
  internal.componentIndex.clear();
  internal.componentVersions.clear();

  return internal;
}

/**
 * Rebuilds all active query indexes using the restored active entities and component sets.
 * @internal
 */
export function rebuildQueries<TComponents extends ComponentRegistry>(
  world: World<TComponents>
): void {
  const internal = world.getSerializationView();
  internal.queries.forEach(query => {
    query.rebuild(internal.activeEntities, internal.entityComponentSets);
  });
}

/**
 * Initializes and registers componentMaps, componentIndex, and componentVersions for a given component type.
 * @internal
 */
export function restoreComponentStorage(
  internal: InternalWorldAccess,
  type: string
): {
  storage: ComponentStorage<unknown>;
  index: Set<number>;
  versions: Map<number, number>;
} {
  const storage = internal.useSparseSetStorage
    ? new SparseSetStorage<unknown>()
    : new MapStorage<unknown>();
  const index = new Set<number>();
  const versions = new Map<number, number>();

  internal.componentMaps.set(type, storage);
  internal.componentIndex.set(type, index);
  internal.componentVersions.set(type, versions);

  return { storage, index, versions };
}

/**
 * Registers a component type in an entity's component set within internal entityComponentSets.
 * @internal
 */
export function registerEntityComponent(
  internal: InternalWorldAccess,
  entityId: number,
  type: string
): void {
  let componentSet = internal.entityComponentSets.get(entityId);
  if (!componentSet) {
    componentSet = new Set();
    internal.entityComponentSets.set(entityId, componentSet);
  }
  componentSet.add(type);
}
