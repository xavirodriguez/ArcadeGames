import { DEFAULT_BELT_MOVEMENT_CONFIG } from "./BeltMovementTypes";

/**
 * Calculates normalized depth t in [0, 1] between depthMin and depthMax.
 *
 * @param y - Vertical position on ground plane.
 * @param depthMin - Minimum depth boundary (default 280).
 * @param depthMax - Maximum depth boundary (default 520).
 * @returns Normalized depth factor clamped to [0, 1].
 */
export function depthT(
  y: number,
  depthMin = DEFAULT_BELT_MOVEMENT_CONFIG.depthMin,
  depthMax = DEFAULT_BELT_MOVEMENT_CONFIG.depthMax
): number {
  if (depthMax === depthMin) return 0;
  const t = (y - depthMin) / (depthMax - depthMin);
  return Math.min(1, Math.max(0, t));
}
