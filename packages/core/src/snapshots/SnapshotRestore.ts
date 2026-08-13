import { ComponentCloner } from "../ecs/ComponentCloner";
import { ComponentRegistry } from "../ecs/Component";
import { World } from "../ecs/World";
import { WorldSnapshot } from "./WorldSnapshot";

/** @public */
export class SnapshotRestore {
  /**
   * Restores the world state from a snapshot.
   *
   * @remarks
   * This method performs a restoration of entities and components from the snapshot,
   * rebuilding internal indexes and queries. It is a computationally expensive
   * operation intended for scene transitions, rollback, or game loading.
   *
   * @warning
   * - **Restores serializable state**: This operation is intended to restore only the serializable
   *   state captured in the snapshot (primitive values, plain objects/arrays).
   * - **Manual state management**: Transient state, non-serializable resources (e.g., textures,
   *   audio buffers), or external subscriptions are generally not captured and should be managed
   *   or re-initialized manually as needed.
   *
   * @param world - The world instance to restore.
   * @param state - The snapshot to restore.
   */
  public static restore<TComponents extends ComponentRegistry>(
    world: World<TComponents>,
    state: WorldSnapshot
  ): void {
    if (state.isSoA) {
      throw new Error("SnapshotRestore does not support SoA WorldSnapshot. Use SnapshotRestoreSoA instead.");
    }

    world["activeEntities"] = new Set(state.entities);
    world["nextEntityId"] = state.nextEntityId;
    world["freeEntities"] = [...state.freeEntities];
    if (state.generations) {
      (world as any).generations = Array.from(state.generations);
    } else {
      (world as any).generations = [];
    }
    world["_structureVersion"] = state.structureVersion;
    world["_stateVersion"] = state.stateVersion;
    world["_tick"] = state.tick;

    if (state.rngState !== undefined) {
      world.gameplayRandom.setSeed(state.rngState);
    } else if (state.seed !== undefined) {
      world.gameplayRandom.setSeed(state.seed);
    }

    world["entityComponentSets"].clear();
    world["componentMaps"].clear();
    world["componentIndex"].clear();
    world["componentVersions"].clear();

    for (const type in state.componentData) {
      const storage = new Map<number, any>();
      const index = new Set<number>();
      const versions = new Map<number, number>();

      world["componentMaps"].set(type, storage);
      world["componentIndex"].set(type, index);
      world["componentVersions"].set(type, versions);

      const snapshotEntities = state.componentData[type];
      for (const entityIdStr in snapshotEntities) {
        const entityId = parseInt(entityIdStr);
        const sourceComp = snapshotEntities[entityId];
        const component = ComponentCloner.cloneComponent(sourceComp);

        storage.set(entityId, component);
        index.add(entityId);
        versions.set(entityId, world["_stateVersion"]);

        let componentSet = world["entityComponentSets"].get(entityId);
        if (!componentSet) {
          componentSet = new Set();
          world["entityComponentSets"].set(entityId, componentSet);
        }
        componentSet.add(type);
      }
    }

    world["queries"].forEach(query => {
      query.rebuild(world["activeEntities"], world["entityComponentSets"]);
    });
  }
}
