import { World, BlueprintRegistryMap } from "./World";
import { ComponentRegistry, Component } from "./Component";
import { CoreComponentRegistry } from "./CoreComponents";
import { EventRegistry } from "../events/EventBus";
import { Entity } from "./Entity";
import {
  TransformComponent,
  VelocityComponent,
  RenderComponent,
  ColliderComponent,
  TTLComponent,
  CollisionEventsComponent
} from "./CoreComponents";

/**
 * Fluent builder for creating and configuring core ECS entities.
 * Restricts builder operations strictly to platform-agnostic core components.
 * @public
 */
export class EntityBuilder<
  TComponents extends ComponentRegistry = CoreComponentRegistry,
  TEvents extends EventRegistry = EventRegistry,
  TBlueprints extends BlueprintRegistryMap<TComponents> = BlueprintRegistryMap<TComponents>
> {
  protected readonly world: World<TComponents, TEvents, TBlueprints>;
  protected readonly entity: Entity;
  protected readonly useCommandBuffer: boolean;

  protected constructor(world: World<TComponents, TEvents, TBlueprints>, entity: Entity, useCommandBuffer = false) {
    this.world = world;
    this.entity = entity;
    this.useCommandBuffer = useCommandBuffer;
  }

  /**
   * Creates a new Entity in the given World and initializes an EntityBuilder instance.
   */
  public static create<
    TComponents extends ComponentRegistry = CoreComponentRegistry,
    TEvents extends EventRegistry = EventRegistry,
    TBlueprints extends BlueprintRegistryMap<TComponents> = BlueprintRegistryMap<TComponents>
  >(world: World<TComponents, TEvents, TBlueprints>): EntityBuilder<TComponents, TEvents, TBlueprints> {
    return createBuilderInstance((w, e, cb) => new EntityBuilder(w, e, cb), world, undefined, false);
  }

  /**
   * Constructs an EntityBuilder wrapping an existing Entity ID in the World.
   */
  public static fromEntity<
    TComponents extends ComponentRegistry = CoreComponentRegistry,
    TEvents extends EventRegistry = EventRegistry,
    TBlueprints extends BlueprintRegistryMap<TComponents> = BlueprintRegistryMap<TComponents>
  >(world: World<TComponents, TEvents, TBlueprints>, entity: Entity): EntityBuilder<TComponents, TEvents, TBlueprints> {
    return createBuilderInstance((w, e, cb) => new EntityBuilder(w, e, cb), world, entity, false);
  }

  /**
   * Creates an EntityBuilder that queues component additions onto the World's command buffer.
   */
  public static createDeferred<
    TComponents extends ComponentRegistry = CoreComponentRegistry,
    TEvents extends EventRegistry = EventRegistry,
    TBlueprints extends BlueprintRegistryMap<TComponents> = BlueprintRegistryMap<TComponents>
  >(world: World<TComponents, TEvents, TBlueprints>): EntityBuilder<TComponents, TEvents, TBlueprints> {
    return createBuilderInstance((w, e, cb) => new EntityBuilder(w, e, cb), world, undefined, true);
  }

  /**
   * Attaches a Transform component with default values, merged with optional config.
   */
  public withTransform(config?: Partial<Omit<TransformComponent, "type">>): this {
    const x = config?.x ?? 0;
    const y = config?.y ?? 0;
    const rotation = config?.rotation ?? 0;
    const scaleX = config?.scaleX ?? 1;
    const scaleY = config?.scaleY ?? 1;

    const component: TransformComponent = {
      type: "Transform",
      x,
      y,
      rotation,
      scaleX,
      scaleY,
      worldX: config?.worldX ?? x,
      worldY: config?.worldY ?? y,
      worldRotation: config?.worldRotation ?? rotation,
      worldScaleX: config?.worldScaleX ?? scaleX,
      worldScaleY: config?.worldScaleY ?? scaleY,
      dirty: config?.dirty ?? false,
      parentEntity: config?.parentEntity
    };

    this.addComponent(component);
    return this;
  }

  /**
   * Attaches a Velocity component with default values, merged with optional config.
   */
  public withVelocity(config?: Partial<Omit<VelocityComponent, "type">>): this {
    const component: VelocityComponent = {
      type: "Velocity",
      vx: config?.vx ?? 0,
      vy: config?.vy ?? 0,
      angularVelocity: config?.angularVelocity ?? 0
    };

    this.addComponent(component);
    return this;
  }

  /**
   * Attaches a Render component with default values, merged with optional config.
   */
  public withRender(config?: Partial<Omit<RenderComponent, "type">>): this {
    const component: RenderComponent = {
      type: "Render",
      visible: config?.visible ?? true,
      opacity: config?.opacity ?? 1,
      order: config?.order ?? 0,
      rotation: config?.rotation ?? 0,
      angularVelocity: config?.angularVelocity ?? 0,
      hitFlashFrames: config?.hitFlashFrames ?? 0,
      spriteId: config?.spriteId,
      color: config?.color,
      shape: config?.shape,
      size: config?.size
    };

    this.addComponent(component);
    return this;
  }

  /**
   * Attaches a Core Collider component.
   */
  public withCollider(config: Partial<Omit<ColliderComponent, "type">>): this {
    const component: ColliderComponent = {
      type: "Collider",
      shape: config.shape!,
      layer: config.layer ?? 1,
      mask: config.mask ?? 0xffff,
      enabled: config.enabled ?? true,
      isTrigger: config.isTrigger ?? false,
      offsetX: config.offsetX,
      offsetY: config.offsetY
    };

    this.addComponent(component);
    return this;
  }

  /**
   * Attaches a Time To Live (TTL) component.
   */
  public withTTL(remaining: number, onCompleteEvent?: string): this {
    const component: TTLComponent = {
      type: "TTL",
      remaining,
      timeLeft: remaining,
      onCompleteEvent
    };

    this.addComponent(component);
    return this;
  }

  /**
   * Attaches a CollisionEvents component initialized with empty collision buffers.
   */
  public withCollisionEvents(): this {
    const component: CollisionEventsComponent = {
      type: "CollisionEvents",
      collisions: [],
      activeTriggers: [],
      triggersEntered: [],
      triggersExited: []
    };

    this.addComponent(component);
    return this;
  }

  /**
   * Finalizes building and returns the created or configured entity ID.
   */
  public build(): Entity {
    return this.entity;
  }

  protected addComponent(
    component:
      | TransformComponent
      | VelocityComponent
      | RenderComponent
      | ColliderComponent
      | TTLComponent
      | CollisionEventsComponent
      | Component
  ): void {
    type K = Extract<keyof TComponents, string>;
    const typedComp = component as TComponents[K] & { type: K };
    if (this.useCommandBuffer) {
      this.world.getCommandBuffer().addComponent(this.entity, typedComp);
    } else {
      this.world.addComponent(this.entity, typedComp);
    }
  }
}

/**
 * Generic helper function to instantiate an EntityBuilder or subclass instance.
 * @internal
 */
export function createBuilderInstance<
  TBuilder extends EntityBuilder<TComponents, TEvents, TBlueprints>,
  TComponents extends ComponentRegistry = CoreComponentRegistry,
  TEvents extends EventRegistry = EventRegistry,
  TBlueprints extends BlueprintRegistryMap<TComponents> = BlueprintRegistryMap<TComponents>
>(
  factory: (world: World<TComponents, TEvents, TBlueprints>, entity: Entity, useCommandBuffer: boolean) => TBuilder,
  world: World<TComponents, TEvents, TBlueprints>,
  entity?: Entity,
  useCommandBuffer: boolean = false
): TBuilder {
  const targetEntity = entity !== undefined ? entity : world.createEntity();
  return factory(world, targetEntity, useCommandBuffer);
}

/**
 * Factory helper function to instantiate an EntityBuilder.
 * @public
 */
export function createEntityBuilder<
  TComponents extends ComponentRegistry = CoreComponentRegistry,
  TEvents extends EventRegistry = EventRegistry,
  TBlueprints extends BlueprintRegistryMap<TComponents> = BlueprintRegistryMap<TComponents>
>(world: World<TComponents, TEvents, TBlueprints>, entity?: Entity): EntityBuilder<TComponents, TEvents, TBlueprints> {
  return entity !== undefined
    ? EntityBuilder.fromEntity(world, entity)
    : EntityBuilder.create(world);
}
