import { ComponentRegistry } from "../ecs/Component";
import { World } from "../ecs/World";
import { WorldSnapshot, SoAComponentBlock } from "./WorldSnapshot";
import { SoADeserializer } from "./SoADeserializer";

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
   * Restores a single component block from SoA format into internal ECS maps.
   *
   * @param world - The active ECS World instance.
   * @param type - Component type key string.
   * @param soaData - SoA component block data.
   */
  public static restoreSoAComponent<TComponents extends ComponentRegistry>(
    world: World<TComponents>,
    type: string,
    soaData: SoAComponentBlock
  ): void {
    const storage = new Map<number, any>();
    const index = new Set<number>();
    const versions = new Map<number, number>();

    world["componentMaps"].set(type, storage);
    world["componentIndex"].set(type, index);
    world["componentVersions"].set(type, versions);

    const entities = soaData.entities;

    SoADeserializer.hydrateEntities(entities, soaData, type, (entityId, component) => {
      storage.set(entityId, component);
      index.add(entityId);
      versions.set(entityId, world["_stateVersion"]);

      let componentSet = world["entityComponentSets"].get(entityId);
      if (!componentSet) {
        componentSet = new Set();
        world["entityComponentSets"].set(entityId, componentSet);
      }
      componentSet.add(type);
    });
  }

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
      this.restoreSoAComponent(world, type, soaComponentData[type]);
    }

    world["queries"].forEach(query => {
      query.rebuild(world["activeEntities"], world["entityComponentSets"]);
    });
  }
}
