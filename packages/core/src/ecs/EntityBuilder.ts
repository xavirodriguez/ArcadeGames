import { World, BlueprintRegistryMap } from "./World";
import { WorldCommandBuffer } from "./WorldCommandBuffer";
import { Component, ComponentType } from "./Component";
import {
  TransformComponent,
  VelocityComponent,
  RenderComponent,
  ColliderComponent,
  Collider2DComponent,
  CollisionEventsComponent,
  TTLComponent,
  HealthComponent,
  BoundaryComponent,
  SpriteComponent,
  CoreComponentRegistry
} from "./CoreComponents";
import { Shape } from "../physics/shapes/Shapes";
import { CollisionLayer, CollisionMask } from "../physics/collision/CollisionTypes";
import { FactionComponent } from "../ai/FactionComponent";
import { TagComponent } from "./TagComponent";
import { EventRegistry } from "../events/EventBus";

/**
 * Fluent builder for creating and configuring entities with components in an ECS World.
 *
 * @remarks
 * `EntityBuilder` simplifies entity instantiation by providing a chainable API with sensible defaults.
 * It automatically handles whether mutations must be buffered via `WorldCommandBuffer`
 * (e.g. when called inside a system `update` loop) or applied directly to `World`.
 *
 * @public
 */
export class EntityBuilder<
  TComponents extends Record<string, Component> = CoreComponentRegistry,
  TEvents extends EventRegistry = EventRegistry,
  TBlueprints extends BlueprintRegistryMap<TComponents> = BlueprintRegistryMap<TComponents>
> {
  private world: World<TComponents, TEvents, TBlueprints>;
  private entityId: number;
  private isDeferred: boolean;
  private commandBuffer: WorldCommandBuffer<TComponents, TEvents, TBlueprints>;

  constructor(
    world: World<TComponents, TEvents, TBlueprints>,
    entityId?: number,
    options?: { forceDeferred?: boolean }
  ) {
    this.world = world;
    this.commandBuffer = world.getCommandBuffer();

    const mustDefer = options?.forceDeferred ?? world.isUpdating;
    this.isDeferred = mustDefer;

    if (entityId !== undefined) {
      this.entityId = entityId;
      if (this.isDeferred) {
        this.commandBuffer.createEntity(this.entityId);
      } else {
        this.world.activateEntity(this.entityId);
      }
    } else {
      if (this.isDeferred) {
        this.entityId = this.world.reserveEntityId();
        this.commandBuffer.createEntity(this.entityId);
      } else {
        this.entityId = this.world.createEntity();
      }
    }
  }

  /**
   * Returns the entity ID associated with this builder instance.
   */
  public getEntityId(): number {
    return this.entityId;
  }

  private addBuiltComponent(component: Component & { type: ComponentType<TComponents> }): void {
    if (this.isDeferred) {
      this.commandBuffer.addComponent(this.entityId, component as TComponents[ComponentType<TComponents>] & { type: ComponentType<TComponents> });
    } else {
      this.world.addComponent(this.entityId, component as TComponents[ComponentType<TComponents>] & { type: ComponentType<TComponents> });
    }
  }

  /**
   * Adds a custom or generic component to the entity.
   */
  public withComponent<K extends ComponentType<TComponents>>(
    component: TComponents[K] & { type: K }
  ): this {
    if (this.isDeferred) {
      this.commandBuffer.addComponent(this.entityId, component);
    } else {
      this.world.addComponent(this.entityId, component);
    }
    return this;
  }

  /**
   * Helper to attach a Transform component with sensible defaults.
   */
  public withTransform(config: {
    x: number;
    y: number;
    rotation?: number;
    scaleX?: number;
    scaleY?: number;
    worldX?: number;
    worldY?: number;
    worldRotation?: number;
    worldScaleX?: number;
    worldScaleY?: number;
    dirty?: boolean;
    parentEntity?: number;
  }): this {
    const transform: TransformComponent = {
      type: "Transform",
      x: config.x,
      y: config.y,
      rotation: config.rotation ?? 0,
      scaleX: config.scaleX ?? 1,
      scaleY: config.scaleY ?? 1,
      worldX: config.worldX ?? config.x,
      worldY: config.worldY ?? config.y,
      worldRotation: config.worldRotation ?? config.rotation ?? 0,
      worldScaleX: config.worldScaleX ?? config.scaleX ?? 1,
      worldScaleY: config.worldScaleY ?? config.scaleY ?? 1,
      dirty: config.dirty ?? true,
      parentEntity: config.parentEntity
    };
    this.addBuiltComponent(transform as TransformComponent & { type: ComponentType<TComponents> });
    return this;
  }

  /**
   * Helper to attach a Velocity component with sensible defaults.
   */
  public withVelocity(config: {
    vx?: number;
    vy?: number;
    angularVelocity?: number;
  } = {}): this {
    const velocity: VelocityComponent = {
      type: "Velocity",
      vx: config.vx ?? 0,
      vy: config.vy ?? 0,
      angularVelocity: config.angularVelocity ?? 0
    };
    this.addBuiltComponent(velocity as VelocityComponent & { type: ComponentType<TComponents> });
    return this;
  }

  /**
   * Helper to attach a Render component with sensible defaults.
   */
  public withRender(config: {
    shape?: string;
    spriteId?: string;
    size?: number;
    color?: string;
    visible?: boolean;
    opacity?: number;
    order?: number;
    rotation?: number;
    angularVelocity?: number;
    hitFlashFrames?: number;
  }): this {
    const render: RenderComponent = {
      type: "Render",
      shape: config.shape,
      spriteId: config.spriteId,
      size: config.size ?? 1,
      color: config.color,
      visible: config.visible ?? true,
      opacity: config.opacity ?? 1,
      order: config.order ?? 0,
      rotation: config.rotation ?? 0,
      angularVelocity: config.angularVelocity ?? 0,
      hitFlashFrames: config.hitFlashFrames ?? 0
    };
    this.addBuiltComponent(render as RenderComponent & { type: ComponentType<TComponents> });
    return this;
  }

  /**
   * Helper to attach a Collider component with sensible defaults.
   */
  public withCollider(config: {
    shape: Shape;
    layer?: CollisionLayer;
    mask?: CollisionMask;
    enabled?: boolean;
    isTrigger?: boolean;
    offsetX?: number;
    offsetY?: number;
  }): this {
    const collider: ColliderComponent = {
      type: "Collider",
      shape: config.shape,
      layer: config.layer ?? 1,
      mask: config.mask ?? 0xffff,
      enabled: config.enabled ?? true,
      isTrigger: config.isTrigger ?? false,
      offsetX: config.offsetX,
      offsetY: config.offsetY
    };
    this.addBuiltComponent(collider as ColliderComponent & { type: ComponentType<TComponents> });
    return this;
  }

  /**
   * Helper to attach a Collider2D component with sensible defaults.
   */
  public withCollider2D(config: {
    shape: { type: "circle"; radius: number } | { type: "aabb"; halfWidth: number; halfHeight: number };
    layer?: number;
    mask?: number;
    enabled?: boolean;
    isTrigger?: boolean;
    offsetX?: number;
    offsetY?: number;
  }): this {
    const collider2D: Collider2DComponent = {
      type: "Collider2D",
      shape: config.shape,
      layer: config.layer ?? 1,
      mask: config.mask ?? 0xffff,
      enabled: config.enabled ?? true,
      isTrigger: config.isTrigger ?? false,
      offsetX: config.offsetX ?? 0,
      offsetY: config.offsetY ?? 0
    };
    this.addBuiltComponent(collider2D as Collider2DComponent & { type: ComponentType<TComponents> });
    return this;
  }

  /**
   * Helper to attach an empty CollisionEvents component.
   */
  public withCollisionEvents(): this {
    const events: CollisionEventsComponent = {
      type: "CollisionEvents",
      collisions: [],
      activeTriggers: [],
      triggersEntered: [],
      triggersExited: []
    };
    this.addBuiltComponent(events as CollisionEventsComponent & { type: ComponentType<TComponents> });
    return this;
  }

  /**
   * Helper to attach a TTL (Time To Live) component.
   */
  public withTTL(remainingSeconds: number, onCompleteEvent?: string): this {
    const ttl: TTLComponent = {
      type: "TTL",
      remaining: remainingSeconds,
      timeLeft: remainingSeconds,
      onCompleteEvent
    };
    this.addBuiltComponent(ttl as TTLComponent & { type: ComponentType<TComponents> });
    return this;
  }

  /**
   * Helper to attach a Health component.
   */
  public withHealth(current: number, max?: number, invulnerableRemaining?: number): this {
    const health: HealthComponent = {
      type: "Health",
      current,
      max: max ?? current,
      invulnerableRemaining
    };
    this.addBuiltComponent(health as HealthComponent & { type: ComponentType<TComponents> });
    return this;
  }

  /**
   * Helper to attach a Boundary component.
   */
  public withBoundary(config: {
    width: number;
    height: number;
    mode: "wrap" | "bounce" | "destroy";
    bounceX?: boolean;
    bounceY?: boolean;
  }): this {
    const boundary: BoundaryComponent = {
      type: "Boundary",
      width: config.width,
      height: config.height,
      mode: config.mode,
      bounceX: config.bounceX,
      bounceY: config.bounceY
    };
    this.addBuiltComponent(boundary as BoundaryComponent & { type: ComponentType<TComponents> });
    return this;
  }

  /**
   * Helper to attach a PowerUp component.
   */
  public withPowerUp(powerUpType: string, duration = 9999): this {
    this.addBuiltComponent({
      type: "PowerUp" as ComponentType<TComponents>,
      powerUpType,
      duration
    } as Component & { type: ComponentType<TComponents> });
    return this;
  }

  /**
   * Helper to attach a Faction component.
   */
  public withFaction(value: string): this {
    const factionComp: FactionComponent = {
      type: "Faction",
      value
    };
    this.addBuiltComponent(factionComp as FactionComponent & { type: ComponentType<TComponents> });
    return this;
  }

  /**
   * Helper to attach a Tag component.
   */
  public withTag(tags: string[]): this {
    const tagComp: TagComponent = {
      type: "Tag",
      tags
    };
    this.addBuiltComponent(tagComp as TagComponent & { type: ComponentType<TComponents> });
    return this;
  }

  /**
   * Helper to attach a Sprite component.
   */
  public withSprite(config: {
    textureId?: string;
    assetKey?: string;
    srcRect?: { x: number; y: number; w: number; h: number };
    anchor?: { x: number; y: number };
    flipX?: boolean;
    flipY?: boolean;
    tint?: string;
  }): this {
    const sprite: SpriteComponent = {
      type: "Sprite",
      textureId: config.textureId,
      assetKey: config.assetKey,
      srcRect: config.srcRect,
      anchor: config.anchor ?? { x: 0.5, y: 0.5 },
      flipX: config.flipX,
      flipY: config.flipY,
      tint: config.tint
    };
    this.addBuiltComponent(sprite as SpriteComponent & { type: ComponentType<TComponents> });
    return this;
  }

  /**
   * Finalizes entity creation and returns the entity ID.
   */
  public build(): number {
    return this.entityId;
  }

  /**
   * Alias for `build()`.
   */
  public commit(): number {
    return this.build();
  }
}

/**
 * Creates a new fluent `EntityBuilder` for the given World instance.
 * @public
 */
export function createEntityBuilder<
  TComponents extends Record<string, Component> = CoreComponentRegistry,
  TEvents extends EventRegistry = EventRegistry,
  TBlueprints extends BlueprintRegistryMap<TComponents> = BlueprintRegistryMap<TComponents>
>(
  world: World<TComponents, TEvents, TBlueprints>,
  entityId?: number,
  options?: { forceDeferred?: boolean }
): EntityBuilder<TComponents, TEvents, TBlueprints> {
  return new EntityBuilder(world, entityId, options);
}

/**
 * Factory helper function to instantiate an EntityBuilder.
 * @public
 */
export function createEntityBuilder(world: World<any>, entity?: Entity): EntityBuilder {
  return entity !== undefined
    ? EntityBuilder.fromEntity(world, entity)
    : EntityBuilder.create(world);
}
