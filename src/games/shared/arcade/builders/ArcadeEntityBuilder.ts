import { EntityBuilder, World, Entity, Collider2DComponent } from "@tiny-aster/core";
import { PowerUpComponent } from "../types/ArcadeTypes";

/**
 * Arcade-level EntityBuilder extension adding arcade-specific helpers
 * such as PowerUp and Collider2D without polluting @tiny-aster/core boundaries.
 * @public
 */
export class ArcadeEntityBuilder {
  private readonly builder: EntityBuilder;
  private readonly world: World<any>;
  private readonly entity: Entity;
  private readonly useCommandBuffer: boolean;

  private constructor(world: World<any>, entity: Entity, builder: EntityBuilder, useCommandBuffer = false) {
    this.world = world;
    this.entity = entity;
    this.builder = builder;
    this.useCommandBuffer = useCommandBuffer;
  }

  /**
   * Creates a new ArcadeEntityBuilder in the given World.
   */
  public static create(world: World<any>): ArcadeEntityBuilder {
    const builder = EntityBuilder.create(world);
    return new ArcadeEntityBuilder(world, builder.build(), builder, false);
  }

  /**
   * Wraps an existing entity ID in an ArcadeEntityBuilder.
   */
  public static fromEntity(world: World<any>, entity: Entity): ArcadeEntityBuilder {
    const builder = EntityBuilder.fromEntity(world, entity);
    return new ArcadeEntityBuilder(world, entity, builder, false);
  }

  /**
   * Creates an ArcadeEntityBuilder using deferred command buffer updates.
   */
  public static createDeferred(world: World<any>): ArcadeEntityBuilder {
    const builder = EntityBuilder.createDeferred(world);
    return new ArcadeEntityBuilder(world, builder.build(), builder, true);
  }

  public withTransform(config?: Parameters<EntityBuilder["withTransform"]>[0]): this {
    this.builder.withTransform(config);
    return this;
  }

  public withVelocity(config?: Parameters<EntityBuilder["withVelocity"]>[0]): this {
    this.builder.withVelocity(config);
    return this;
  }

  public withRender(config?: Parameters<EntityBuilder["withRender"]>[0]): this {
    this.builder.withRender(config);
    return this;
  }

  public withCollider(config: Parameters<EntityBuilder["withCollider"]>[0]): this {
    this.builder.withCollider(config);
    return this;
  }

  public withTTL(remaining: number, onCompleteEvent?: string): this {
    this.builder.withTTL(remaining, onCompleteEvent);
    return this;
  }

  public withCollisionEvents(): this {
    this.builder.withCollisionEvents();
    return this;
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

  /**
   * Builds and returns the Entity ID.
   */
  public build(): Entity {
    return this.builder.build();
  }

  private addComponent(component: any): void {
    if (this.useCommandBuffer) {
      this.world.getCommandBuffer().addComponent(this.entity, component);
    } else {
      this.world.addComponent(this.entity, component);
    }
  }
}
