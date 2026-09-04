import { Entity } from "./Entity";
import { ComponentRegistry } from "./Component";

// Resolve environment check safely without free variables
const isDev = typeof (globalThis as unknown as { __DEV__?: boolean }).__DEV__ !== "undefined"
  ? (globalThis as unknown as { __DEV__?: boolean }).__DEV__
  : (process.env.NODE_ENV !== "production");

/**
 * A Query provides a filtered view of entities that possess a specific set of components.
 *
 * @remarks
 * Queries are automatically updated by the {@link World} when components are added or removed.
 * They maintain an internally sorted list of entities to support a stable iteration order based on entity IDs.
 *
 * Performance: Queries are designed for efficiency as they cache their results and only update when
 * structural changes occur in the world.
 *
 * @typeParam TComponents - The component registry this query operates on.
 * @public
 */
export class Query<_TComponents extends ComponentRegistry> {
  private entities: Set<Entity> = new Set();
  private sortedEntities: Entity[] = [];
  private isDirty = false;
  private _sortedEntitiesArray: Entity[] = [];

  /**
   * @internal
   * @param componentTypes - The list of component types required by this query.
   */
  constructor(private componentTypes: string[]) {}

  /**
   * Checks if a set of component types matches the query's requirements.
   */
  public matches(componentSet: Set<string>): boolean {
    return this.componentTypes.every(type => componentSet.has(type));
  }

  public add(entity: Entity): void {
    if (!this.entities.has(entity)) {
      this.entities.add(entity);
      this.isDirty = true;
    }
  }

  public remove(entity: Entity): void {
    if (this.entities.delete(entity)) {
      this.isDirty = true;
    }
  }

  /**
   * Returns a list of entities that match the query, sorted by ID.
   *
   * @remarks
   * Sorting happens lazily and only when the query is "dirty" (after entities are added or
   * removed).
   *
   * @warning
   * **Stable Iteration Order**: The list is sorted by entity ID to support stable
   * iteration across frames. This stability relies on entity IDs being
   * created and recycled consistently within the {@link World}.
   *
   * **Performance & Memory**: The first access after a structural change (add/remove)
   * incurs an O(N log N) sorting cost and creates a new array. Frequent structural
   * changes combined with query access in hot paths is expected to increase GC pressure.
   */
  public getEntities(): ReadonlyArray<Entity> {
    if (this.isDirty) {
      if (isDev) {
        // In development, keep freezing the array to prevent silent/accidental mutations.
        this.sortedEntities = Array.from(this.entities).sort((a, b) => a - b);
        Object.freeze(this.sortedEntities);
      } else {
        // In production, reuse the existing array structure to avoid garbage collection overhead.
        const arr: Entity[] = this._sortedEntitiesArray;
        arr.length = 0;
        for (const entity of this.entities) {
          arr.push(entity);
        }
        arr.sort((a, b) => a - b);
        this.sortedEntities = arr;
      }
      this.isDirty = false;
    }
    return this.sortedEntities;
  }

  public rebuild(activeEntities: Set<Entity>, entityComponentSets: Map<Entity, Set<string>>): void {
    this.entities.clear();
    activeEntities.forEach(entity => {
      const set = entityComponentSets.get(entity);
      if (set && this.matches(set)) {
        this.entities.add(entity);
      }
    });
    this.isDirty = true;
  }
}
