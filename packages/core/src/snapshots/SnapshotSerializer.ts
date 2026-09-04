import { ComponentCloner } from "../ecs/ComponentCloner";
import { ComponentRegistry } from "../ecs/Component";
import { World } from "../ecs/World";
import { WorldSnapshot, AoSWorldSnapshot, ComponentDataSnapshot, SerializedComponent } from "./WorldSnapshot";
import { buildSnapshotMetadata } from "./SnapshotMetadataBuilder";

/**
 * Internal interface to access private world state for serialization.
 */
interface InternalWorldAccess<_TComponents extends ComponentRegistry> {
  activeEntities: Set<number>;
  entityComponentSets: Map<number, Set<string>>;
  componentMaps: Map<string, Map<number, unknown>>;
  nextEntityId: number;
  freeEntities: number[];
  generations?: number[];
}

/**
 * Classical Array of Structures (AoS) Serializer.
 *
 * @remarks
 * This class captures the entire ECS World state into an Array of Structures (AoS) layout,
 * where components are grouped by entity ID inside nested record maps.
 *
 * While highly inspectable and great for development or sparse incremental updates, AoS serialization
 * relies on deep object copying and allocates extensive temporary hashes, leading to garbage
 * collection (GC) overhead in high-frequency update loops.
 *
 * @public
 */
export class SnapshotSerializer {
  /**
   * Captures the current serializable state of the world in an AoS layout.
   *
   * @remarks
   * Iterates over all active entities and their associated components, cloning each field deeply
   * using `ComponentCloner.cloneComponent` to ensure complete isolation.
   *
   * @warning
   * **Serialization boundaries**: Only plain JS objects, arrays, and primitive values are supported.
   * - Functions and class methods are discarded.
   * - Circular references will trigger infinite loops or serialization exceptions.
   * - Native handles (like Canvas contexts, Skia objects, or Audio nodes) must be re-initialized manually on restore.
   *
   * **Performance characteristics**: Due to deep cloning of components and map allocation, this function
   * introduces O(E * C) allocation complexity, where E is the active entity count and C is the component count.
   * In tight frame budgets, consider using the highly optimized SoA alternative: `SnapshotSerializerSoA`.
   *
   * @param world - The ECS World simulation container to capture.
   * @param target - An optional pre-existing AoSWorldSnapshot instance to partially reuse, mitigating allocation overhead.
   * @returns A fully populated, isolated AoSWorldSnapshot instance.
   */
  public static snapshot<TComponents extends ComponentRegistry>(
    world: World<TComponents>,
    target?: AoSWorldSnapshot
  ): AoSWorldSnapshot {
    const componentData: ComponentDataSnapshot = target?.componentData ?? {};
    const internal = world as unknown as InternalWorldAccess<TComponents>;

    const activeEntities = internal.activeEntities;
    const entityComponentSets = internal.entityComponentSets;
    const componentMaps = internal.componentMaps;

    activeEntities.forEach(entity => {
      const componentSet = entityComponentSets.get(entity);
      if (!componentSet) return;

      for (const type of componentSet) {
        const map = componentMaps.get(type);
        if (!map) continue;
        const component = map.get(entity);
        if (!component) continue;

        if (!componentData[type]) componentData[type] = {};

        let serializedComp = componentData[type][entity];
        if (!serializedComp) {
          serializedComp = {};
          componentData[type][entity] = serializedComp;
        }

        const compAsRecord = component as unknown as Record<string, unknown>;
        for (const key in compAsRecord) {
          const val = compAsRecord[key];
          if (typeof val !== "function") {
            serializedComp[key] = ComponentCloner.cloneComponent(val);
          }
        }
      }
    });

    return {
      ...buildSnapshotMetadata(world, internal, activeEntities),
      componentData
    };
  }

  /**
   * Captures the changes in component data since a specific version.
   *
   * @remarks
   * Identifies components that have been modified (based on `stateVersion`)
   * and returns their serialized state.
   *
   * @warning
   * Subject to the same serialization limits as `SnapshotSerializer.snapshot`.
   *
   * @param world - The world to snapshot.
   * @param sinceVersion - The state version to compare against.
   * @returns A partial snapshot containing only the changed components.
   */
  public static deltaSnapshot<TComponents extends ComponentRegistry>(
    world: World<TComponents>,
    sinceVersion: number
  ): Partial<WorldSnapshot> {
    const componentData: ComponentDataSnapshot = {};
    const internal = world as unknown as InternalWorldAccess<TComponents> & { componentVersions: Map<string, Map<number, number>> };
    const componentMaps = internal.componentMaps;
    const componentVersions = internal.componentVersions;

    componentMaps.forEach((map, type) => {
      const typeVersions = componentVersions.get(type);
      if (!typeVersions) return;

      const typeData: Record<number, SerializedComponent> = {};
      let hasData = false;

      map.forEach((component, entity) => {
        const version = typeVersions.get(entity) ?? 0;
        if (version > sinceVersion) {
          const serializedComp: SerializedComponent = {};
          const compAsRecord = component as unknown as Record<string, unknown>;

          for (const key in compAsRecord) {
            if (typeof compAsRecord[key] !== "function") {
              serializedComp[key] = ComponentCloner.cloneComponent(compAsRecord[key]);
            }
          }
          typeData[entity] = serializedComp;
          hasData = true;
        }
      });

      if (hasData) {
        componentData[type] = typeData;
      }
    });

    return {
      componentData,
      stateVersion: world.stateVersion,
      structureVersion: world.structureVersion,
      tick: world.tick
    };
  }
}
