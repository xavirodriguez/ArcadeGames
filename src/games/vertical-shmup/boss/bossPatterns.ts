import type { BulletPatternConfig } from "../../shared/BulletPatternSystem";
import type { BossPhase } from "./bossPhase";

export const BOSS_BULLET_RATE_PER_SEC = 0.8;
export const BOSS_BULLET_SPEED_FACTOR = 0.75;
export const BOSS_BULLET_WAVE_SPEED_CAP = 1.5;
export const BOSS_BULLET_WAVE_RATE_FACTOR = 0.15;

/** Spiral rotation per volley: 22.5° for phase 2, 15° for the dense phase 3. */
export const BOSS_PHASE_TWO_SPIN = Math.PI / 8;
export const BOSS_PHASE_THREE_SPIN = Math.PI / 12;

export interface BossPatternScaling {
  bulletCount: number;
  phase: BossPhase;
}

/**
 * Per-phase attack configuration. Phase 1 is the classic 8-bullet ring;
 * phases 2 and 3 are spirals with 8 and 12 bullets respectively.
 */
export function createBossPatternConfig(
  phase: BossPhase,
  baseBulletSpeed: number,
  wave: number
): BulletPatternConfig {
  const waveMultiplier = 1 + Math.max(0, wave - 1) * BOSS_BULLET_WAVE_RATE_FACTOR;
  const speed = baseBulletSpeed * BOSS_BULLET_SPEED_FACTOR * Math.min(BOSS_BULLET_WAVE_SPEED_CAP, waveMultiplier);
  const ratePerSec = BOSS_BULLET_RATE_PER_SEC * waveMultiplier;

  if (phase === 1) {
    return { kind: "ring", bulletCount: 8, speed, ratePerSec };
  }
  if (phase === 2) {
    return { kind: "spiral", bulletCount: 8, speed, ratePerSec, spinPerShot: BOSS_PHASE_TWO_SPIN };
  }
  return { kind: "spiral", bulletCount: 12, speed, ratePerSec, spinPerShot: BOSS_PHASE_THREE_SPIN };
}

/** Pure data projection used by tests and future HUD/SFX layers. */
export function bossPatternScaling(phase: BossPhase): BossPatternScaling {
  return {
    phase,
    bulletCount: phase === 1 ? 8 : phase === 2 ? 8 : 12
  };
}
