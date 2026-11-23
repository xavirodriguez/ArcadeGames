/**
 * Pure boss combat-phase resolver.
 *
 * Thresholds are intentionally strict and non-overlapping:
 * - phase 1: hp ratio > 66 %
 * - phase 2: 33 % < hp ratio <= 66 %
 * - phase 3: hp ratio <= 33 %
 * A hit that lands exactly on 66 % enters phase 2; exactly on 33 % enters phase 3.
 */

export type BossPhase = 1 | 2 | 3;

export const BOSS_PHASE_ONE_THRESHOLD = 0.66;
export const BOSS_PHASE_TWO_THRESHOLD = 0.33;

export function resolveBossPhase(currentHp: number, maxHp: number): BossPhase {
  if (!(maxHp > 0)) return 3;
  const ratio = Math.max(0, Math.min(1, currentHp / maxHp));
  if (ratio > BOSS_PHASE_ONE_THRESHOLD) return 1;
  if (ratio > BOSS_PHASE_TWO_THRESHOLD) return 2;
  return 3;
}

/** Boss phases never regress, even if health is restored by a mutator or heal. */
export function nextBossPhase(current: BossPhase, candidate: BossPhase): BossPhase {
  return candidate > current ? candidate : current;
}
