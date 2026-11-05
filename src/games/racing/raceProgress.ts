/**
 * Pure race-progress utilities for Micro Racers.
 * No World / system / resource dependencies — safe for tests and snapshots.
 */

export interface LapLike {
  currentLap: number;
  lastCheckpoint: number;
}

export interface Point2D {
  x: number;
  y: number;
}

/**
 * Discrete progress used as the canonical competitive metric.
 *
 * currentLap starts at 1, lastCheckpoint starts at -1.
 * progress 0  => start of race
 * progress 1  => passed checkpoint 0
 * progress N  => completed one full lap (N checkpoints)
 */
export function computeDiscreteProgress(
  lap: LapLike,
  totalCheckpoints: number
): number {
  if (!Number.isFinite(totalCheckpoints) || totalCheckpoints <= 0) return 0;
  const currentLap = Math.max(1, Math.floor(lap.currentLap) || 1);
  const last = Math.max(-1, Math.floor(lap.lastCheckpoint));
  // Clamp lastCheckpoint into valid range for safety
  const clampedLast = Math.min(last, totalCheckpoints - 1);
  return (currentLap - 1) * totalCheckpoints + clampedLast + 1;
}

/**
 * Project point P onto segment AB. Returns t in [0,1] and the projected point.
 * Degenerate segments (A≈B) return t=0 and point A.
 */
export function projectPointOnSegment(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number
): { t: number; x: number; y: number } {
  const abx = bx - ax;
  const aby = by - ay;
  const lenSq = abx * abx + aby * aby;
  if (lenSq < 1e-8) {
    return { t: 0, x: ax, y: ay };
  }
  const apx = px - ax;
  const apy = py - ay;
  let t = (apx * abx + apy * aby) / lenSq;
  if (t < 0) t = 0;
  else if (t > 1) t = 1;
  return { t, x: ax + t * abx, y: ay + t * aby };
}

export interface InterpolatedProgressOptions {
  /** Vehicle position */
  position: Point2D;
  /** Ordered checkpoint positions (same order as index 0..N-1) */
  checkpointPositions: readonly Point2D[];
  /** Lap state */
  lap: LapLike;
  /**
 * When true, never allow the returned progress to be lower than the discrete floor.
 * Default true.
 */
  preventRegression?: boolean;
}

/**
 * Continuous progress = completedCheckpoints + fraction along the next segment.
 * Falls back to discrete progress when geometry is unusable.
 */
export function computeInterpolatedProgress(
  options: InterpolatedProgressOptions
): number {
  const { position, checkpointPositions, lap } = options;
  const preventRegression = options.preventRegression !== false;
  const n = checkpointPositions.length;
  if (n <= 0) return 0;

  const discrete = computeDiscreteProgress(lap, n);
  // completedCheckpoints is the number of checkpoints already passed
  // (lastCheckpoint + 1, or 0 when lastCheckpoint === -1)
  const completed = Math.max(0, Math.min(n, (lap.lastCheckpoint | 0) + 1));

  // Next checkpoint index (wrap for circular tracks)
  const nextIdx = completed % n;
  // Previous checkpoint index (the one we last crossed, or the last of the previous lap)
  let prevIdx: number;
  if (lap.lastCheckpoint < 0) {
    // At race start: treat the segment from the finish line (checkpoint 0) behind us
    // as already complete; fraction stays 0 until we approach checkpoint 0.
    return discrete; // 0
  }
  prevIdx = lap.lastCheckpoint % n;

  const prev = checkpointPositions[prevIdx];
  const next = checkpointPositions[nextIdx];
  if (!prev || !next) return discrete;

  const { t } = projectPointOnSegment(
    position.x,
    position.y,
    prev.x,
    prev.y,
    next.x,
    next.y
  );

  // Base completed count for this lap segment, plus lap offset
  const lapOffset = Math.max(0, (Math.floor(lap.currentLap) || 1) - 1) * n;
  let progress = lapOffset + completed + t;

  // Never go below the discrete floor (avoids regression when crossing)
  if (preventRegression && progress < discrete) {
    progress = discrete;
  }
  return progress;
}

/**
 * Convenience: prefer interpolated progress when positions are available,
 * otherwise discrete.
 */
export function computeRaceProgress(
  lap: LapLike,
  totalCheckpoints: number,
  position?: Point2D | null,
  checkpointPositions?: readonly Point2D[] | null
): number {
  if (
    position &&
    checkpointPositions &&
    checkpointPositions.length === totalCheckpoints &&
    totalCheckpoints > 0
  ) {
    return computeInterpolatedProgress({
      position,
      checkpointPositions,
      lap
    });
  }
  return computeDiscreteProgress(lap, totalCheckpoints);
}
