import { PrefabPool, PrefabConfig } from "./PrefabPool";
import { World } from "../ecs/World";
import { Component } from "../ecs/Component";
import {
  Entity,
  TransformComponent,
  VelocityComponent,
  RenderComponent,
  Collider2DComponent,
  TTLComponent,
  ReclaimableComponent
} from "../ecs/CoreComponents";

/**
 * Standard component set for a projectile.
 * @public
 */
export interface ProjectileComponents extends Record<string, Component> {
  /** Spatial transform component governing position and rotation. */
  position: TransformComponent;
  /** Linear velocity component (pixels per second or unit per tick). */
  velocity: VelocityComponent;
  /** Render style component governing shape, color, and size. */
  render: RenderComponent;
  /** Collider component for collision detection. */
  collider: Collider2DComponent;
  /** Time-to-live component managing lifetime expiration in seconds or ticks. */
  ttl: TTLComponent;
  /** Reclaimable component marking pool origin for recycling. */
  reclaimable: ReclaimableComponent;
}

/**
 * Standard parameters for initializing a projectile.
 * @public
 */
export interface ProjectileParams {
  /** Initial horizontal spawn coordinate in world space. */
  x: number;
  /** Initial vertical spawn coordinate in world space. */
  y: number;
  /** Horizontal velocity vector component. */
  dx: number;
  /** Vertical velocity vector component. */
  dy: number;
  /** Collision and visual bounding size in pixels. */
  size: number;
  /** Render color hex/CSS string. */
  color: string;
  /** Lifetime duration in seconds before automatic recycling. */
  ttl: number;
  /** Render shape variant (e.g. "circle" | "rect"). */
  shape?: string;
  /** Collision layer bitmask. */
  layer?: number;
  /** Collision filter mask bitmask. */
  mask?: number;
}

/**
 * Base class for projectile pools.
 * Provides a standardized way to manage recycling of bullets and particles.
 *
 * @public
 */
export abstract class ProjectilePool<T extends ProjectileComponents = ProjectileComponents, P extends ProjectileParams = ProjectileParams>
  extends PrefabPool<T, P> {

  constructor(config: PrefabConfig<T, P>) {
    super(config);
  }

  /**
   * Acquires a projectile and initializes it with standard physical and visual properties.
   */
  public override acquire(world: World, params: P): Entity {
    return super.acquire(world, params);
  }
}
