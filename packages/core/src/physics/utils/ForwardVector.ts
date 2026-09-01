/**
 * @file ForwardVector.ts
 *
 * Single Source of Truth for Entity Orientation & Forward Vectors in TinyAsterEngine.
 *
 * ## Convention Rules & Invariants
 * 1. **Canonical Orientation**: `rotation = 0` corresponds to facing strictly right along the positive X-axis (`+X`),
 *    documented by {@link SHIP_FORWARD_AXIS} (`{ x: 1, y: 0 }`).
 * 2. **Forward Vector Formula**:
 *    - `vx = cos(rotation) * speed`
 *    - `vy = sin(rotation) * speed`
 * 3. **Bullet & Projectile Visual Rotation Prohibition**:
 *    - **NEVER** overwrite or recalculate the visual/transform rotation of a spawned bullet using `atan2(vy, vx)`
 *      when the bullet's velocity includes inherited ship velocity.
 *    - Bullet velocity consists of ship velocity + muzzle velocity (`v_ship + v_forward`). `atan2(vy, vx)` computes
 *      the movement trajectory angle, which differs from the physical facing direction (`transform.rotation`).
 *    - Overwriting `transform.rotation` with `atan2(vy, vx)` causes visual misalignment. This rule is explicitly
 *      protected by `AsteroidsGameplay.test.ts` (test: "should align bullet rotation with ship rotation even if ship has non-zero velocity").
 *
 * @public
 */

/**
 * Standard forward direction vector for ships and entities facing right (+X axis) at rotation 0.
 *
 * @remarks
 * At rotation = 0 radians, an entity's nose points strictly along the positive X axis (+X).
 *
 * @public
 */
export const SHIP_FORWARD_AXIS = { x: 1, y: 0 } as const;

/**
 * Calculates a normalized forward vector given a rotation angle in radians.
 *
 * @remarks
 * Uses the canonical trigonometric convention where rotation = 0 corresponds to facing right (+X):
 * - `x = cos(rotation)`
 * - `y = sin(rotation)`
 *
 * @param rotation - Angle in radians.
 * @returns Normalized 2D direction vector `{ x, y }`.
 *
 * @public
 */
export function getForwardVector(rotation: number): { x: number; y: number } {
  return {
    x: Math.cos(rotation),
    y: Math.sin(rotation)
  };
}
