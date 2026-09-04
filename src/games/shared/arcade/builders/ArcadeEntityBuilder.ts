import { EntityBuilder, World, Entity, Collider2DComponent } from "@tiny-aster/core";
import { PowerUpComponent } from "../types/ArcadeTypes";

/**
 * Arcade-level EntityBuilder extension adding arcade-specific helpers
 * such as PowerUp and Collider2D without polluting @tiny-aster/core boundaries.
 * @public
 */
import { ComponentRegistry, CoreComponentRegistry, BlueprintRegistryMap, EventRegistry } from "@tiny-aster/core";

export class ArcadeEntityBuilder<
  TComponents extends ComponentRegistry = CoreComponentRegistry,
  TEvents extends EventRegistry = EventRegistry,
  TBlueprints extends BlueprintRegistryMap<TComponents> = BlueprintRegistryMap<TComponents>
> extends EntityBuilder<TComponents, TEvents, TBlueprints> {
  /**
   * Creates a new ArcadeEntityBuilder in the given World.
   */
  public static override create<
    TComponents extends ComponentRegistry = CoreComponentRegistry,
    TEvents extends EventRegistry = EventRegistry,
    TBlueprints extends BlueprintRegistryMap<TComponents> = BlueprintRegistryMap<TComponents>
  >(world: World<TComponents, TEvents, TBlueprints>): ArcadeEntityBuilder<TComponents, TEvents, TBlueprints> {
    const entity = world.createEntity();
    return new ArcadeEntityBuilder(world, entity, false);
  }

  /**
   * Wraps an existing entity ID in an ArcadeEntityBuilder.
   */
  public static override fromEntity<
    TComponents extends ComponentRegistry = CoreComponentRegistry,
    TEvents extends EventRegistry = EventRegistry,
    TBlueprints extends BlueprintRegistryMap<TComponents> = BlueprintRegistryMap<TComponents>
  >(world: World<TComponents, TEvents, TBlueprints>, entity: Entity): ArcadeEntityBuilder<TComponents, TEvents, TBlueprints> {
    return new ArcadeEntityBuilder(world, entity, false);
  }

  /**
   * Creates an ArcadeEntityBuilder using deferred command buffer updates.
   */
  public static override createDeferred<
    TComponents extends ComponentRegistry = CoreComponentRegistry,
    TEvents extends EventRegistry = EventRegistry,
    TBlueprints extends BlueprintRegistryMap<TComponents> = BlueprintRegistryMap<TComponents>
  >(world: World<TComponents, TEvents, TBlueprints>): ArcadeEntityBuilder<TComponents, TEvents, TBlueprints> {
    const entity = world.createEntity();
    return new ArcadeEntityBuilder(world, entity, true);
  }

  /**
   * Attaches a Collider2D component for 2D physics / platformer detection.
   */
  public withCollider2D(config: Partial<Omit<Collider2DComponent, "type">>): this {
    const component: Collider2DComponent = {
      type: "Collider2D",
      shape: config.shape ?? { type: "aabb", halfWidth: 10, halfHeight: 10 },
      layer: config.layer ?? 1,
      mask: config.mask ?? 0xffff,
      offsetX: config.offsetX ?? 0,
      offsetY: config.offsetY ?? 0,
      isTrigger: config.isTrigger ?? false,
      enabled: config.enabled ?? true
    };

    this.addComponent(component);
    return this;
  }

  /**
   * Attaches a PowerUp component.
   */
  public withPowerUp(powerUpType: string): this {
    const component: PowerUpComponent = {
      type: "PowerUp",
      powerUpType
    };

    this.addComponent(component);
    return this;
  }
}
