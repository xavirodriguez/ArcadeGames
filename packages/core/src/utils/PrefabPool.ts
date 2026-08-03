import { World } from "../ecs/World";
import { Component } from "../ecs/Component";
import { Entity } from "../ecs/CoreComponents";
import { ComponentSetPool } from "./ComponentSetPool";

/**
 * Configuration for a PrefabPool.
 *
 * @public
 */
export interface PrefabConfig<T extends Record<string, Component>, I> {
  factory: () => T;
  reset: (data: T) => void;
  initializer: (components: T, params: I, world: World, entity: Entity) => void;
  initialSize?: number;
}

/**
 * A PrefabPool provides a declarative way to manage pools of complex entities.
 * It combines an ComponentSetPool with a specific initialization logic.
 *
 * @public
 */
export class PrefabPool<T extends Record<string, Component>, I> {
  private pool: ComponentSetPool<T>;
  private initializer: (components: T, params: I, world: World, entity: Entity) => void;

  constructor(config: PrefabConfig<T, I>) {
    this.pool = new ComponentSetPool<T>(config.factory, config.reset, config.initialSize || 0);
    this.initializer = config.initializer;
  }

  /**
   * Acquires a new entity from the pool and initializes it with the provided parameters.
   */
  public acquire(world: World, params: I): Entity {
    // We use getMutableComponent internally during initialization to ensure
    // state versioning is triggered even for new entities, while allowing
    // the initializer to work with raw-like access.
    const { entity, components } = this.pool.acquire(world);

    // The components are already in the world (or command buffer).
    // We call the initializer which should now ideally use mutateComponent
    // or we wrap the whole thing.
    this.initializer(components, params, world, entity);

    // Force a state sync for all components added
    for (const key in components) {
        world.mutateComponent(entity, components[key].type, () => {});
    }

    return entity;
  }

  /**
   * Releases an entity back to the pool.
   */
  public release(world: World, entity: Entity): void {
    let finalWorld = world;
    let finalEntity = entity;

    if (!(world instanceof World) && ((entity as any) instanceof World)) {
      finalWorld = entity as any;
      finalEntity = world as any;
    } else if (!(world instanceof World) && typeof world === "number" && entity === undefined) {
      throw new TypeError(
        `PrefabPool.release expects a World instance as the first argument, but received an Entity ID (${world}). ` +
        `Make sure to pass both world and entity: pool.release(world, entity).`
      );
    }

    if (!finalWorld || !(finalWorld instanceof World)) {
      throw new TypeError(
        `PrefabPool.release: Invalid World instance provided. ` +
        `Expected World, received: ${typeof finalWorld}`
      );
    }

    if (typeof finalEntity !== "number") {
      throw new TypeError(
        `PrefabPool.release: Invalid Entity ID provided. ` +
        `Expected a number, received: ${typeof finalEntity}`
      );
    }

    this.pool.release(finalWorld, finalEntity);
  }

  /**
   * Current size of the underlying pool.
   */
  public get size(): number {
    return this.pool.size;
  }
}
