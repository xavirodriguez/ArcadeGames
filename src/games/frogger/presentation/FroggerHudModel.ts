import type { FroggerConfig } from "../types/FroggerConfigSchema";

/**
 * Display-only score formatting. Keeps at least six digits grouped in threes:
 * 4250 -> "004 250". The numeric score in game state is never changed.
 */
export function formatFroggerScore(score: number): string {
  const safeScore = Number.isFinite(score) ? Math.max(0, Math.floor(score)) : 0;
  const digits = String(safeScore).padStart(6, "0");
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
}

/** Mirrors the time-limit formula used by FroggerGameStateSystem for the HUD. */
export function getFroggerTimeLimit(config: FroggerConfig, level: number): number {
  const baseLimit = config.FROG_TIME_LIMIT ?? 30;
  const reductionPerLevel = config.TIME_LIMIT_REDUCTION_PER_LEVEL ?? 0;
  const minimumLimit = config.MIN_TIME_LIMIT ?? 15;
  const levelOffset = Math.max(0, Math.floor(level) - 1);
  const reducedLimit = baseLimit - reductionPerLevel * levelOffset;
  return Math.max(minimumLimit, reducedLimit);
}

/** Return a clamped 0..1 fraction for the visual timer bar. */
export function getFroggerTimeProgress(timeRemaining: number, timeLimit: number): number {
  if (!Number.isFinite(timeRemaining) || !Number.isFinite(timeLimit) || timeLimit <= 0) {
    return 0;
  }
  return Math.min(1, Math.max(0, timeRemaining / timeLimit));
}
