/**
 * Shared walkable-area geometry for Hit & Run.
 *
 * Derived exclusively from the physical belt limits (`depthMin` / `depthMax`)
 * so that presentation themes never maintain an independent visual configuration.
 *
 * The geometry is world-space (same coordinate system as Transform.y and the
 * belt movement systems). Themes are responsible for projecting it into screen
 * space using the active camera.
 */

import {
  DEFAULT_BELT_MOVEMENT_CONFIG,
  type BeltMovementConfig
} from "./BeltMovementConfig";

/**
 * Immutable description of the playable depth band.
 *
 * - `depthMin` — upper boundary of the walkable plane (closer to background).
 * - `depthMax` — lower boundary of the walkable plane (closer to foreground).
 * - `height`   — vertical extent of the band (`depthMax - depthMin`).
 * - `midY`     — centre line of the band (useful for default spawn / lane centres).
 */
export interface WalkableAreaGeometry {
  readonly depthMin: number;
  readonly depthMax: number;
  readonly height: number;
  readonly midY: number;
}

/**
 * Builds a {@link WalkableAreaGeometry} from a movement config.
 * Always prefers the values present on the config; falls back to the
 * module defaults only when the config itself is missing the fields.
 */
export function createWalkableAreaGeometry(
  config: Pick<BeltMovementConfig, "depthMin" | "depthMax"> = DEFAULT_BELT_MOVEMENT_CONFIG
): WalkableAreaGeometry {
  const depthMin = Number.isFinite(config.depthMin)
    ? config.depthMin
    : DEFAULT_BELT_MOVEMENT_CONFIG.depthMin;
  const depthMax = Number.isFinite(config.depthMax)
    ? config.depthMax
    : DEFAULT_BELT_MOVEMENT_CONFIG.depthMax;

  // Guard against inverted or zero-height bands (should never happen in practice).
  const safeMin = Math.min(depthMin, depthMax);
  const safeMax = Math.max(depthMin, depthMax);

  return Object.freeze({
    depthMin: safeMin,
    depthMax: safeMax,
    height: safeMax - safeMin,
    midY: (safeMin + safeMax) * 0.5
  });
}

/** Default geometry matching {@link DEFAULT_BELT_MOVEMENT_CONFIG}. */
export const DEFAULT_WALKABLE_AREA_GEOMETRY: WalkableAreaGeometry =
  createWalkableAreaGeometry(DEFAULT_BELT_MOVEMENT_CONFIG);

/**
 * Resource key used to publish the geometry into the ECS world so that
 * presentation code can read it without re-deriving values.
 */
export const WALKABLE_AREA_GEOMETRY_RESOURCE = "WalkableAreaGeometry";

/** Must stay in sync with BELT_MOVEMENT_CONFIG_RESOURCE in BeltMovementTypes. */
const BELT_MOVEMENT_CONFIG_RESOURCE_KEY = "BeltMovementConfig";

/**
 * Resolves the current walkable geometry from the world.
 * Prefers an explicitly published resource; otherwise derives it from the
 * active {@link BeltMovementConfig}.
 */
export function getWalkableAreaGeometry(world: {
  getResource: <T>(key: string) => T | undefined;
}): WalkableAreaGeometry {
  const published = world.getResource<WalkableAreaGeometry>(WALKABLE_AREA_GEOMETRY_RESOURCE);
  if (published) return published;

  const config =
    world.getResource<BeltMovementConfig>(BELT_MOVEMENT_CONFIG_RESOURCE_KEY) ??
    DEFAULT_BELT_MOVEMENT_CONFIG;

  return createWalkableAreaGeometry(config);
}
