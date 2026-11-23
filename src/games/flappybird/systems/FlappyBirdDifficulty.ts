import type { FlappyBirdConfig } from "../types/FlappyBirdConfigSchema";
import { SCENARIO_ORDER } from "../ScenarioDefinitions";

export const FLAPPY_NARROW_GAP_MULTIPLIER = 0.7;

export interface ResolveGapSizeOptions {
  baseGapSize: number;
  scenarioGapSizeOverride?: number;
  isNarrowGap: boolean;
  difficultyGapMultiplier?: number;
  minGapSize?: number;
}

/**
 * Resolve the active scenario gap, then apply narrow-gap and global difficulty factors.
 * The base config remains the fallback when a scenario does not declare GAP_SIZE.
 */
export function resolveGapSize(options: ResolveGapSizeOptions): number {
  const scenarioGapSize = options.scenarioGapSizeOverride ?? options.baseGapSize;
  const narrowGapMultiplier = options.isNarrowGap ? FLAPPY_NARROW_GAP_MULTIPLIER : 1;
  const difficultyGapMultiplier = options.difficultyGapMultiplier ?? 1;
  const requestedGapSize =
    scenarioGapSize * narrowGapMultiplier * difficultyGapMultiplier;
  return Math.max(options.minGapSize ?? 0, requestedGapSize);
}


export interface DifficultyRamp {
  speedMultiplier: number;
  gapMultiplier: number;
}

/**
 * Resolve the global ramp solely from generated pipe count and config.
 * lap 0 is the first complete scenario cycle and intentionally remains unchanged.
 */
export function computeDifficultyRamp(
  pipesSpawnedCount: number,
  config: Partial<FlappyBirdConfig>
): DifficultyRamp {
  if (config.DIFFICULTY_RAMP_ENABLED === false) {
    return { speedMultiplier: 1, gapMultiplier: 1 };
  }

  const pipesPerScenario = Math.max(1, config.PIPES_PER_SCENARIO ?? 5);
  const pipeCount = Number.isFinite(pipesSpawnedCount)
    ? Math.max(0, pipesSpawnedCount)
    : 0;
  const cycleLength = pipesPerScenario * SCENARIO_ORDER.length;
  const lap = Math.floor(pipeCount / cycleLength);
  if (lap === 0) return { speedMultiplier: 1, gapMultiplier: 1 };

  const speedIncrement = Math.max(0, config.DIFFICULTY_SPEED_INCREMENT_PER_LAP ?? 0.05);
  const maximumSpeed = Math.max(1, config.MAX_DIFFICULTY_SPEED_MULTIPLIER ?? 1.2);
  const gapReduction = Math.max(0, config.DIFFICULTY_GAP_REDUCTION_PER_LAP ?? 0.03);

  return {
    speedMultiplier: Math.min(1 + lap * speedIncrement, maximumSpeed),
    gapMultiplier: Math.max(0, 1 - lap * gapReduction)
  };
}

/**
 * Simulate the optimal flap cadence using the game's fixed-step order:
 * flap impulse, gravity integration, then movement.
 * Returns maximum upward displacement over the requested interval.
 */
export function estimateMaxFlapAscent(
  gravity: number,
  flapStrength: number,
  flapCooldownMs: number,
  durationSeconds: number,
  frameRate = 60
): number {
  if (frameRate <= 0 || durationSeconds <= 0) return 0;
  const dt = 1 / frameRate;
  const frameCount = Math.floor(durationSeconds * frameRate);
  const flapIntervalFrames = Math.max(1, Math.round(flapCooldownMs * frameRate / 1000));
  let velocityY = 0;
  let displacementY = 0;
  let maximumAscent = 0;

  for (let frame = 0; frame < frameCount; frame++) {
    if (frame % flapIntervalFrames === 0) velocityY = flapStrength;
    velocityY += gravity * dt;
    displacementY += velocityY * dt;
    maximumAscent = Math.max(maximumAscent, -displacementY);
  }

  return maximumAscent;
}
