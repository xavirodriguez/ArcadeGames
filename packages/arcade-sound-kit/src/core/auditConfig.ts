export interface CategoryThresholds {
  targetLufs: number;
  maxPeak: number;
  maxDcOffset: number;
  maxInitialSilenceMs: number;
  maxLoopJump: number;
}

export const AUDIT_TARGETS_BY_CATEGORY: Record<string, CategoryThresholds> = {
  combat: {
    targetLufs: -16,
    maxPeak: 1.0,
    maxDcOffset: 0.05,
    maxInitialSilenceMs: 15,
    maxLoopJump: 0.25,
  },
  movement: {
    targetLufs: -18,
    maxPeak: 0.95,
    maxDcOffset: 0.05,
    maxInitialSilenceMs: 20,
    maxLoopJump: 0.25,
  },
  progression: {
    targetLufs: -17,
    maxPeak: 0.95,
    maxDcOffset: 0.05,
    maxInitialSilenceMs: 15,
    maxLoopJump: 0.25,
  },
  ui: {
    targetLufs: -20,
    maxPeak: 0.85,
    maxDcOffset: 0.05,
    maxInitialSilenceMs: 10,
    maxLoopJump: 0.25,
  },
};
