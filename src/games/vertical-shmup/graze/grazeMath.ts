/**
 * Pure graze geometry helpers (AUD-P2-01).
 * No ECS / no world mutation — safe for unit tests and future ShmupGrazeSystem.
 */

export const DEFAULT_GRAZE_MARGIN = 12;
export const DEFAULT_GRAZE_SCORE = 10;

export interface GrazeRadii {
  hitRadius: number;
  grazeMargin?: number;
}

export function grazeOuterRadius(hitRadius: number, grazeMargin: number = DEFAULT_GRAZE_MARGIN): number {
  return hitRadius + grazeMargin;
}

/**
 * Returns true when distance is strictly outside the hit disk and inside the graze annulus (inclusive outer edge).
 */
export function isGrazeDistance(
  distance: number,
  hitRadius: number,
  grazeMargin: number = DEFAULT_GRAZE_MARGIN
): boolean {
  if (!(distance > hitRadius)) return false;
  return distance <= grazeOuterRadius(hitRadius, grazeMargin);
}

export function distance2D(ax: number, ay: number, bx: number, by: number): number {
  const dx = ax - bx;
  const dy = ay - by;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Evaluate whether a hostile bullet position should grant a graze this tick.
 * Caller enforces per-bullet-once and faction checks.
 */
export function evaluateGraze(params: {
  playerX: number;
  playerY: number;
  bulletX: number;
  bulletY: number;
  hitRadius: number;
  grazeMargin?: number;
  alreadyGrazed?: boolean;
}): { graze: boolean; distance: number } {
  const distance = distance2D(params.playerX, params.playerY, params.bulletX, params.bulletY);
  if (params.alreadyGrazed) {
    return { graze: false, distance };
  }
  const graze = isGrazeDistance(distance, params.hitRadius, params.grazeMargin ?? DEFAULT_GRAZE_MARGIN);
  return { graze, distance };
}
