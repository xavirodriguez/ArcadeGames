import { colors } from "../../../theme/colors";

/**
 * Pure math helpers for Space Invaders visual calculations.
 */

export function calculateShieldHpRatio(hp: number, maxHp: number): number {
  if (maxHp <= 0) return 0;
  return Math.max(0, Math.min(1.0, hp / maxHp));
}

export interface BossPhaseState {
  phase: number;
  baseColor: string;
  accentColor: string;
}

export function calculateBossPhase(hpRatio: number): BossPhaseState {
  if (hpRatio <= 0.33) {
    return { phase: 3, baseColor: colors.redHot, accentColor: colors.orange };
  } else if (hpRatio <= 0.66) {
    return { phase: 2, baseColor: colors.gold, accentColor: colors.orangeDark };
  } else {
    return { phase: 1, baseColor: colors.magentaHot, accentColor: colors.cyan };
  }
}
