import { World } from "./World";
import { Entity } from "./Entity";
import { ComponentRegistry } from "./Component";

/**
 * Utility functions for ECS World entity activity and lifecycle tracking.
 * @public
 */
export class WorldUtils {
  /**
   * Checks if an entity is active in the world by verifying `world.hasEntity` or `Transform` component presence.
   *
   * @param world - The ECS World instance.
   * @param entity - The target entity ID.
   * @returns `true` if the entity exists and is active in the world.
   */
  static isEntityActive<TComponents extends ComponentRegistry = ComponentRegistry>(
    world: World<TComponents, any, any>,
    entity: Entity
  ): boolean {
    if (typeof (world as any).hasEntity === "function") {
      return (world as any).hasEntity(entity);
    }
    return world.hasComponent(entity, "Transform" as any);
  }

  /**
   * Checks if an entity is alive (not marked for reclamation) and active in the world.
   *
   * @param world - The ECS World instance.
   * @param entity - The target entity ID.
   * @returns `true` if the entity is alive and active.
   */
  static isAliveAndTracked<TComponents extends ComponentRegistry = ComponentRegistry>(
    world: World<TComponents, any, any>,
    entity: Entity
  ): boolean {
    if (typeof (world as any).isAlive === "function" && !(world as any).isAlive(entity)) {
      return false;
    }
    return WorldUtils.isEntityActive(world, entity);
  }
}
