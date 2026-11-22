import { ScenarioId } from "../types/FlappyBirdTypes";

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
