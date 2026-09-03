import { World } from "./World";
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
export class EntityBuilder {
  protected readonly world: World<any>;
  protected readonly entity: Entity;
  protected readonly useCommandBuffer: boolean;

  protected constructor(world: World<any>, entity: Entity, useCommandBuffer = false) {
    this.world = world;
    this.entity = entity;
    this.useCommandBuffer = useCommandBuffer;
  }

  /**
   * Creates a new Entity in the given World and initializes an EntityBuilder instance.
   */
  public static create(world: World<any>): EntityBuilder {
    const entity = world.createEntity();
    return new EntityBuilder(world, entity, false);
  }

  /**
   * Constructs an EntityBuilder wrapping an existing Entity ID in the World.
   */
  public static fromEntity(world: World<any>, entity: Entity): EntityBuilder {
    return new EntityBuilder(world, entity, false);
  }

  /**
   * Creates an EntityBuilder that queues component additions onto the World's command buffer.
   */
  public static createDeferred(world: World<any>): EntityBuilder {
    const entity = world.createEntity();
    return new EntityBuilder(world, entity, true);
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

  protected addComponent(component: any): void {
    if (this.useCommandBuffer) {
      this.world.getCommandBuffer().addComponent(this.entity, component);
    } else {
      this.world.addComponent(this.entity, component);
    }
  }
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
