export interface RacingHudSpeedMetrics {
  speed: number;
  ratio: number;
  display: string;
}

/**
 * Converts world-space velocity into stable, display-ready arcade telemetry.
 * The ratio is clamped independently from the displayed speed so tuning the
 * meter never hides an unexpected speed value.
 */
export function computeRacingSpeedMetrics(
  vx: number,
  vy: number,
  maxSpeed: number
): RacingHudSpeedMetrics {
  const safeVx = Number.isFinite(vx) ? vx : 0;
  const safeVy = Number.isFinite(vy) ? vy : 0;
  const safeMaxSpeed = Number.isFinite(maxSpeed) && maxSpeed > 0 ? maxSpeed : 1;
  const speed = Math.round(Math.hypot(safeVx, safeVy));

  return {
    speed,
    ratio: Math.max(0, Math.min(1, speed / safeMaxSpeed)),
    display: String(speed).padStart(3, "0")
  };
}
