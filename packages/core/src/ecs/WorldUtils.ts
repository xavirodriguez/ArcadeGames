import { World } from "./World";
import { Entity } from "./Entity";
import { ComponentRegistry, ComponentType } from "./Component";

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

  /**
   * Safely checks if an entity is alive, active, and has a Transform component, then reclaims or removes it.
   *
   * @param world - The ECS World instance.
   * @param entity - The target entity ID to remove or reclaim.
   * @public
   */
  static removeOrReclaim<TComponents extends ComponentRegistry = ComponentRegistry>(
    world: World<TComponents, any, any>,
    entity: Entity
  ): void {
    if (!WorldUtils.isAliveAndTracked(world, entity) || !world.hasComponent(entity, "Transform" as Extract<keyof TComponents, string>)) {
      return;
    }
    const reclaimable = world.getComponent(entity, "Reclaimable" as Extract<keyof TComponents, string>) as {
      onReclaim?: (ctx: { world: World<TComponents, any, any>; entity: Entity }) => void;
      poolId?: string;
    } | undefined;

    if (reclaimable) {
      if (typeof reclaimable.onReclaim === "function") {
        reclaimable.onReclaim({ world, entity });
      } else if (reclaimable.poolId) {
        const pool = world.getResource<{ release?: (ctx: { world: World<TComponents, any, any>; entity: Entity }) => void }>(reclaimable.poolId);
        if (pool && typeof pool.release === "function") {
          pool.release({ world, entity });
        }
      }
    }
    world.getCommandBuffer().removeEntity(entity);
  }

  /**
   * Checks if two entities contain a matching pair of component types regardless of order.
   *
   * @param world - The ECS World instance.
   * @param entityA - First entity ID.
   * @param entityB - Second entity ID.
   * @param type1 - First component type.
   * @param type2 - Second component type.
   * @returns An object with keys `type1` and `type2` mapping to matching entities, or `undefined`.
   * @public
   */
  static matchPair<
    TComponents extends ComponentRegistry,
    T1 extends ComponentType<TComponents>,
    T2 extends ComponentType<TComponents>
  >(
    world: World<TComponents, any, any>,
    entityA: Entity,
    entityB: Entity,
    type1: T1,
    type2: T2
  ): Record<T1 | T2, Entity> | undefined {
    if (world.hasComponent(entityA, type1) && world.hasComponent(entityB, type2)) {
      return { [type1]: entityA, [type2]: entityB } as Record<T1 | T2, Entity>;
    }
    if (world.hasComponent(entityB, type1) && world.hasComponent(entityA, type2)) {
      return { [type1]: entityB, [type2]: entityA } as Record<T1 | T2, Entity>;
    }
    return undefined;
  }
}
