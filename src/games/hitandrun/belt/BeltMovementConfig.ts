/**
 * Shared belt-scroll movement configuration types and defaults.
 *
 * @remarks
 * This module is intentionally dependency-free (it only contains plain data and
 * types) so that both {@link ./BeltMovementTypes} and {@link ./BeltDepth} can
 * consume the defaults without importing each other. Previously the defaults
 * lived in `BeltMovementTypes`, which re-exported `BeltDepth`, which in turn
 * imported `BeltMovementTypes`, forming a require cycle.
 */

/**
 * Tuning parameters for belt-scroll movement (X progress + Y depth/lanes).
 */
export interface BeltMovementConfig {
  maxSpeedX: number;
  maxSpeedY: number;
  acceleration: number;
  deceleration: number;
  hopImpulse: number;
  hopGravity: number;
  hopMaxAirSeconds: number;
  depthMin: number;
  depthMax: number;
}

export const DEFAULT_BELT_MOVEMENT_CONFIG: BeltMovementConfig = {
  maxSpeedX: 160,
  maxSpeedY: 110,
  acceleration: 900,
  deceleration: 1100,
  hopImpulse: -220,
  hopGravity: 980,
  hopMaxAirSeconds: 0.45,
  depthMin: 280,
  depthMax: 520
};
