/**
 * Single source of truth for boss-wave progression.
 * Both the spawn director and the visual archetype selector must use this predicate.
 */

export const BOSS_WAVE_INTERVAL = 5;

/** Waves are 1-based. A boss wave is every `BOSS_WAVE_INTERVAL` waves. */
export function isShmupBossWave(wave: number): boolean {
  const safeWave = Math.max(1, Math.floor(wave));
  return safeWave % BOSS_WAVE_INTERVAL === 0;
}
