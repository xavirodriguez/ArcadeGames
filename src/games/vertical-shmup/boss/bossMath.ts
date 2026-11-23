/**
 * Pure boss balance helpers.
 * No ECS / no world mutation — safe for unit tests and deterministic replays.
 */

export const DEFAULT_BOSS_HP_BASE = 250;
export const DEFAULT_BOSS_HP_SCALING_START_WAVE = 5;
export const DEFAULT_BOSS_HP_PER_EXTRA_WAVE = 4;

export interface BossHpConfig {
  base: number;
  scalingStartWave: number;
  perExtraWave: number;
}

export const DEFAULT_BOSS_HP_CONFIG: BossHpConfig = {
  base: DEFAULT_BOSS_HP_BASE,
  scalingStartWave: DEFAULT_BOSS_HP_SCALING_START_WAVE,
  perExtraWave: DEFAULT_BOSS_HP_PER_EXTRA_WAVE
};

/**
 * Boss health curve: `base + max(0, wave - scalingStartWave) * perExtraWave`.
 *
 * The default (250 at wave 5, +4 per extra boss wave) yields roughly a 30 s
 * duel against the player's ~8.3 damage/second cadence, instead of reusing the
 * trash-mob `ENEMY_HP` formula.
 */
export function computeBossHp(wave: number, config: BossHpConfig = DEFAULT_BOSS_HP_CONFIG): number {
  const safeWave = Math.max(1, Math.floor(wave));
  const extraWaves = Math.max(0, safeWave - config.scalingStartWave);
  return Math.max(1, Math.floor(config.base + extraWaves * config.perExtraWave));
}
