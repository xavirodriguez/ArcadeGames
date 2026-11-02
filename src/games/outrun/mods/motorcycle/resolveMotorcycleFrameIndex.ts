/**
 * Converts the existing continuous player tilt into one of seven visual poses.
 * The 0.08-radian limit matches computePlayerCarGeometry's current visual tilt
 * coefficient; this function only quantizes presentation and never feeds gameplay.
 */
export const MOTORCYCLE_MAX_TILT_ANGLE = 0.08;
export const MOTORCYCLE_MAX_FRAME_INDEX = 3;

export function resolveMotorcycleFrameIndex(tiltAngle: number): number {
  if (!Number.isFinite(tiltAngle)) return 0;

  const frame = Math.round(
    (tiltAngle / MOTORCYCLE_MAX_TILT_ANGLE) * MOTORCYCLE_MAX_FRAME_INDEX
  );

  return Math.max(
    -MOTORCYCLE_MAX_FRAME_INDEX,
    Math.min(MOTORCYCLE_MAX_FRAME_INDEX, frame)
  );
}
