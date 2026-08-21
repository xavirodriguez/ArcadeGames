import { Entity } from "../../ecs/Entity";

/**
 * Collision layer bitmask (32-bit bitfield).
 * @public
 */
export type CollisionLayer = number;

/**
 * Collision mask bitmask defining which collision layers an entity interacts with.
 * @public
 */
export type CollisionMask = number;

/**
 * Generates a single-bit collision layer flag from a bit index.
 *
 * @param bit - Bit index between 0 and 31.
 * @returns Bitfield mask value `(1 << bit)`.
 * @public
 */
export function layer(bit: number): number {
  return 1 << bit;
}

/**
 * Combines multiple collision layer bitfields into a single mask using bitwise OR.
 *
 * @param layers - Array of layer bitfields to combine.
 * @returns Combined collision bitmask.
 * @public
 */
export function maskOf(...layers: number[]): number {
  return layers.reduce((acc, value) => acc | value, 0);
}

/**
 * Detailed narrowphase manifold results describing a collision encounter between two shapes.
 * @public
 */
export interface CollisionManifold {
  /** Whether the shapes overlap. */
  colliding: boolean;
  /** Normalized X-component of the collision response normal vector. */
  normalX: number;
  /** Normalized Y-component of the collision response normal vector. */
  normalY: number;
  /** Penetration depth required to separate the shapes. */
  depth: number;
  /** World-space contact points where geometric intersection occurred. */
  contactPoints: Array<{ x: number, y: number }>;
}

/**
 * Axis-Aligned Bounding Box (AABB) represented by min/max spatial coordinates.
 * @public
 */
export interface AABB {
  /** Minimum X-coordinate bound. */
  minX: number;
  /** Minimum Y-coordinate bound. */
  minY: number;
  /** Maximum X-coordinate bound. */
  maxX: number;
  /** Maximum Y-coordinate bound. */
  maxY: number;
}

/**
 * Event entry stored inside an entity's `CollisionEvents` component.
 * @public
 */
export interface Collision {
  /** ID of the colliding counterpart entity. */
  otherEntity: Entity;
  /** Collision response normal X. */
  normalX: number;
  /** Collision response normal Y. */
  normalY: number;
  /** Penetration depth. */
  depth: number;
  /** World-space contact points. */
  contactPoints: Array<{ x: number, y: number }>;
}
