import { World, BlueprintRegistryMap } from "../../ecs/World";
import { Entity } from "../../ecs/Entity";
import { ComponentRegistry } from "../../ecs/Component";
import { EventRegistry } from "../../events/EventBus";
import { PhysicsTransformLike, ColliderLike } from "../PhysicsTypes";

/**
 * Result structure returned when querying active physical colliders in the ECS world.
 * @public
 */
export interface ColliderQueryResult {
  /** The matching entity ID. */
  entity: Entity;
  /** Transform component data for spatial positioning. */
  transform: PhysicsTransformLike;
  /** Collider component data with shape and offset settings. */
  collider: ColliderLike;
}

/**
 * Generator function that queries active, enabled colliders and their transforms in the ECS world.
 *
 * @param world - Simulation world instance containing Transform and Collider components.
 * @returns Generator yielding active entity ID, transform, and collider tuples.
 * @public
 */
export function* queryActiveColliders<
  TComponents extends ComponentRegistry = ComponentRegistry,
  TEvents extends EventRegistry = EventRegistry,
  TBlueprints extends BlueprintRegistryMap<TComponents> = BlueprintRegistryMap<TComponents>
>(world: World<TComponents, TEvents, TBlueprints>): Generator<ColliderQueryResult> {
  const colliderType = "Collider" as Extract<keyof TComponents, string>;
  const transformType = "Transform" as Extract<keyof TComponents, string>;

  for (const entity of world.query(colliderType, transformType)) {
    const transform = world.getComponent(entity, transformType) as unknown as PhysicsTransformLike | undefined;
    const collider = world.getComponent(entity, colliderType) as unknown as ColliderLike | undefined;
    if (!transform || !collider || !collider.enabled) continue;
    yield { entity, transform, collider };
  }
}
