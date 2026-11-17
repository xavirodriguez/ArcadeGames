import {
  DEFAULT_BELT_MOVEMENT_CONFIG,
  type BeltMovementConfig
} from "./BeltMovementConfig";

/**
 * Walkable belt band expressed in world-space pixels on Transform.y.
 * Both bounds are inclusive and shared by movement and presentation consumers.
 */
export interface BeltWalkableDepth {
  min: number;
  max: number;
}

/** Minimal level contract needed to resolve belt movement depth. */
export interface BeltLevelDepthDefinition {
  walkableDepth?: BeltWalkableDepth;
}

/**
 * Resolves the movement config using the level's declared walkable band.
 *
 * Levels authored before `walkableDepth` existed retain the legacy defaults;
 * new level definitions should always declare the band explicitly.
 */
export function resolveBeltMovementConfigForLevel(
  level: BeltLevelDepthDefinition,
  baseConfig: BeltMovementConfig = DEFAULT_BELT_MOVEMENT_CONFIG
): BeltMovementConfig {
  const depth = level.walkableDepth;
  if (depth === undefined) return { ...baseConfig };

  if (
    !depth ||
    !Number.isFinite(depth.min) ||
    !Number.isFinite(depth.max) ||
    depth.max <= depth.min
  ) {
    throw new RangeError(
      "Hit & Run level walkableDepth must contain finite world-space bounds with max greater than min."
    );
  }

  return {
    ...baseConfig,
    depthMin: depth.min,
    depthMax: depth.max
  };
}
