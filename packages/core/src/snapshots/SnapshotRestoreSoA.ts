import { ComponentCloner } from "../ecs/ComponentCloner";
import { ComponentRegistry } from "../ecs/Component";
import { World } from "../ecs/World";
import { WorldSnapshot, SoAComponentBlock } from "./WorldSnapshot";

/**
 * Structure of Arrays (SoA) restoration utility.
 *
 * @remarks
 * Reconstructs the complete state of an ECS World from a highly packed `SoAWorldSnapshot`.
 * It unpacks flat Float64 and Int32 buffers back into internal ECS entity-component map registries,
 * completely rebuilding query indexes and component version records.
 *
 * While it recreates component objects during restoration, it does so efficiently, processing indices
 * sequentially to minimize layout cache misses in the JS engine.
 *
 * @public
 */
export class SnapshotRestoreSoA {
  /**
   * Restores the world state from a highly packed SoA snapshot.
   *
   * @remarks
   * Decodes flat arrays of entity slot IDs, values, and optional non-numeric objects.
   * It reconstructs each entity's component record dynamically, converting float values back
   * to booleans or integers based on metadata, and triggers a full query index rebuild.
   *
   * @warning
   * **Throws on AoS layout**: Expects an SoA snapshot (`state.isSoA` is true). If provided with a classic
   * AoS snapshot, it will throw an error. Use `SnapshotRestore.restore` instead.
   *
   * @param world - The active ECS World instance to restore.
   * @param state - The source SoA world snapshot.
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

    const soaComponentData = state.soaComponentData;

    for (const type in soaComponentData) {
      const storage = new Map<number, any>();
      const index = new Set<number>();
      const versions = new Map<number, number>();

      world["componentMaps"].set(type, storage);
      world["componentIndex"].set(type, index);
      world["componentVersions"].set(type, versions);

      const soaData: SoAComponentBlock = soaComponentData[type];
      const keys = soaData.keys;
      const numKeys = keys.length;
      const entities = soaData.entities;

      let numEntities = 0;
      if (entities) {
        if (typeof (entities as unknown as { length?: number }).length === "number") {
          numEntities = (entities as unknown as { length: number }).length;
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
