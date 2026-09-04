import { World } from "../../ecs/World";
import { Entity } from "../../ecs/Entity";
import { CollisionEventsComponent } from "../../ecs/CoreComponents";

/**
 * Searches through `activeTriggers` and `collisions` on the target entity's `CollisionEvents` component
 * for an entity matching the predicate.
 *
 * @param world - Simulation world.
 * @param entity - Entity with potential CollisionEvents component.
 * @param predicate - Function evaluating candidate entities.
 * @returns Matched entity if found, otherwise `null`.
 *
 * @public
 */
export function findMatchingEntityInTriggersOrCollisions<TComponents extends Record<string, any>>(
  world: World<TComponents>,
  entity: Entity,
  predicate: (other: Entity) => boolean
): Entity | null {
  const events = world.getComponent(entity, "CollisionEvents" as Extract<keyof TComponents, string>) as CollisionEventsComponent | undefined;
  if (!events) return null;

  if (events.activeTriggers) {
    const triggers = events.activeTriggers;
    for (let i = 0; i < triggers.length; i++) {
      const other = triggers[i];
      if (predicate(other)) {
        return other;
      }
    }
  }

  if (events.collisions) {
    const cols = events.collisions;
    for (let i = 0; i < cols.length; i++) {
      const other = cols[i].otherEntity;
      if (predicate(other)) {
        return other;
      }
    }
  }

  return null;
}
