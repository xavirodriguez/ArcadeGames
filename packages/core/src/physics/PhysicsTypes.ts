import { Shape } from "./shapes/Shapes";

/**
 * Structural contract for transform component data consumed during physics calculations.
 * Allows spatial queries and physics integration without strict component registry coupling.
 * @public
 */
export interface PhysicsTransformLike {
  /** Local-space position X. */
  x: number;
  /** Local-space position Y. */
  y: number;
  /** Optional computed world-space position X. */
  worldX?: number;
  /** Optional computed world-space position Y. */
  worldY?: number;
  /** Local-space orientation in radians. */
  rotation?: number;
  /** Optional computed world-space orientation in radians. */
  worldRotation?: number;
  /** Local scale X. */
  scaleX?: number;
  /** Local scale Y. */
  scaleY?: number;
  /** Computed world scale X. */
  worldScaleX?: number;
  /** Computed world scale Y. */
  worldScaleY?: number;
}

/**
 * Structural contract for collider component data consumed during physics calculations.
 * @public
 */
export interface ColliderLike {
  /** Collision shape geometry definition. */
  shape: Shape;
  /** Whether the collider active state is enabled. */
  enabled: boolean;
  /** Center offset X relative to transform origin. */
  offsetX?: number;
  /** Center offset Y relative to transform origin. */
  offsetY?: number;
}

/**
 * Computes the world-space center coordinates for a transform and collider.
 * @public
 */
export function getColliderWorldCenter(
  transform: PhysicsTransformLike,
  collider: ColliderLike
): { cx: number; cy: number } {
  const worldX = transform.worldX ?? transform.x;
  const worldY = transform.worldY ?? transform.y;
  return {
    cx: worldX + (collider.offsetX ?? 0),
    cy: worldY + (collider.offsetY ?? 0),
  };
}
