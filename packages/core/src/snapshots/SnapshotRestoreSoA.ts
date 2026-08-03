import { ComponentCloner } from "../ecs/ComponentCloner";
import { ComponentRegistry } from "../ecs/Component";
import { World } from "../ecs/World";
import { WorldSnapshot } from "./WorldSnapshot";

/**
 * Structure of Arrays (SoA) Restoration utility.
 *
 * @remarks
 * Restores world component state from structured SoA snapshots, rebuilding
 * internal ECS maps and index indices with high performance.
 * @public
 */
export class SnapshotRestoreSoA {
  /**
   * Restores the world state from a highly packed SoA snapshot.
   */
  public static restore<TComponents extends ComponentRegistry>(
    world: World<TComponents>,
    state: WorldSnapshot
  ): void {
    if (!state.isSoA) {
      throw new Error("[SnapshotRestoreSoA] State snapshot is not formatted as SoA.");
    }

    world["activeEntities"] = new Set(state.entities);
    world["nextEntityId"] = state.nextEntityId;
    world["freeEntities"] = [...state.freeEntities];
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

    const soaComponentData = state.soaComponentData;

    for (const type in soaComponentData) {
      const storage = new Map<number, any>();
      const index = new Set<number>();
      const versions = new Map<number, number>();

      world["componentMaps"].set(type, storage);
      world["componentIndex"].set(type, index);
      world["componentVersions"].set(type, versions);

      const soaData = soaComponentData[type];
      const keys = soaData.keys;
      const numKeys = keys.length;
      const entities = soaData.entities;

      let numEntities = 0;
      if (entities) {
        if (typeof (entities as any).length === "number") {
          numEntities = (entities as any).length;
        } else {
          numEntities = Object.keys(entities).filter(k => !isNaN(Number(k))).length;
        }
      }

      const values = soaData.values;
      const nonNumericValues = soaData.nonNumericValues;
      const booleanKeys = soaData.booleanKeys ? new Set(soaData.booleanKeys) : null;

      for (let i = 0; i < numEntities; i++) {
        const entityId = (entities as any)[i];

        // Reconstruct component instance dynamically
        const component: Record<string, any> = { type };

        for (let j = 0; j < numKeys; j++) {
          const key = keys[j];
          const offset = i * numKeys + j;
          const nonNumericVal = nonNumericValues ? nonNumericValues[offset] : undefined;

          if (nonNumericVal !== undefined && nonNumericVal !== null) {
            component[key] = ComponentCloner.cloneComponent(nonNumericVal);
          } else {
            const rawVal = values[offset];
            if (booleanKeys && booleanKeys.has(key)) {
              component[key] = rawVal === 1;
            } else {
              component[key] = rawVal;
            }
          }
        }

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
