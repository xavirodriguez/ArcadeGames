import { TransformComponent, VelocityComponent } from "@tiny-aster/core";

/**
 * Audit of Player Blueprints Across Games:
 * ---------------------------------------
 * 1. SpaceInvadersGame:
 *    - Transform: { x, y }
 *    - Velocity: { vx: 0, vy: 0 }
 *    - Collider: CircleShape (radius: config.PLAYER_COLLIDER_RADIUS)
 *    - Gameplay: Health, Faction ("player"), Boundary, Input (moveLeft, moveRight, shoot), Combo
 *
 * 2. EchoRunnerGame:
 *    - Transform: { x, y }
 *    - Velocity: { vx: 0, vy: 0 }
 *    - Collider2D: AABB shape ({ halfWidth: 10, halfHeight: 15 })
 *    - Gameplay: Health, Hurtbox, PlatformerMovementConfig, PlatformerGravityConfig, PlatformerJumper, PlatformerGroundState
 *
 * 3. GeometryWars (Entities):
 *    - Transform: { x, y, rotation: 0, scaleX: 1, scaleY: 1, ... }
 *    - Velocity: { vx: 0, vy: 0 }
 *    - Collider: None
 *    - Gameplay: Player (twin-stick), Aim (aimX, aimY, isFiring), Health (1)
 *
 * Conclusion:
 * `Transform` and `Velocity` share identical structural definitions across all games.
 * In contrast, `Collider` / `Collider2D` (Circle vs AABB vs Box), inputs, and gameplay
 * components vary significantly by game mechanics and must remain defined locally in each game's blueprints.
 */

/**
 * Creates a standard Transform component object initialized with default spatial properties.
 *
 * @param x - Initial X position in world space. Defaults to 0.
 * @param y - Initial Y position in world space. Defaults to 0.
 * @param options - Optional rotation (radians) and scale factors.
 * @returns Fully populated `TransformComponent`.
 * @public
 */
export function createStandardTransform(
  x = 0,
  y = 0,
  options: { rotation?: number; scaleX?: number; scaleY?: number } = {}
): TransformComponent {
  const rotation = options.rotation ?? 0;
  const scaleX = options.scaleX ?? 1;
  const scaleY = options.scaleY ?? 1;

  return {
    type: "Transform",
    x,
    y,
    rotation,
    scaleX,
    scaleY,
    worldX: x,
    worldY: y,
    worldRotation: rotation,
    worldScaleX: scaleX,
    worldScaleY: scaleY,
    dirty: false
  };
}

/**
 * Creates a standard Velocity component object initialized with default or given 2D velocity vectors.
 *
 * @param vx - Linear velocity along X axis. Defaults to 0.
 * @param vy - Linear velocity along Y axis. Defaults to 0.
 * @param angularVelocity - Angular velocity in radians per second. Defaults to 0.
 * @returns Fully populated `VelocityComponent`.
 * @public
 */
export function createStandardVelocity(
  vx = 0,
  vy = 0,
  angularVelocity = 0
): VelocityComponent {
  return {
    type: "Velocity",
    vx,
    vy,
    angularVelocity
  };
}
