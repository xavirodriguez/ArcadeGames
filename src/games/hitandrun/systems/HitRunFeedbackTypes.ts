import type { Entity } from "@tiny-aster/core";

/** Payload emitido por CombatSystem / HitRunMeleeSystem (emitDeferred). */
export interface CombatHitPayload {
  targetEntity: Entity;
  sourceEntity?: Entity;
  amount: number;
  remainingHealth: number;
  category?: string;
}

export interface CombatDeathPayload {
  entity: Entity;
  sourceEntity?: Entity;
  category?: string;
}

/** Resource key: "HitStopRemaining" (seconds of global sim freeze). */
export type HitStopRemaining = number;

/**
 * Presentation mirror resource (optional readers).
 * Camera path uses core ScreenShake + ScreenShakeSystem.
 */
export interface HitRunScreenShake {
  intensity: number;
  duration: number;
  elapsed: number;
}

export interface HitFeedbackProfile {
  hitStopSeconds: number;
  shakeIntensity: number;
  shakeDuration: number;
  hitFlashFrames: number;
}

export interface HitRunFeedbackConfig {
  byCategory: Record<string, HitFeedbackProfile>;
  defaultHit: HitFeedbackProfile;
  death: HitFeedbackProfile;
  maxHitStopSeconds: number;
  maxShakeIntensity: number;
}

// ─── Tunables (Paso B) — adjust by hand; do not scatter magic numbers ───

/** Hit-stop on a normal (non-lethal) hit — starting feel value. */
export const HIT_STOP_NORMAL_SECONDS = 0.045;
/** Hit-stop when the hit kills (combat:death) — longer freeze. */
export const HIT_STOP_KILL_SECONDS = 0.1;
/** Cap so combos cannot freeze the sim indefinitely. */
export const HIT_STOP_MAX_SECONDS = 0.2;

/** Screen-shake intensity on a normal hit (pixels scale for ScreenShakeSystem). */
export const SCREEN_SHAKE_NORMAL_INTENSITY = 4;
/** Screen-shake duration on a normal hit (seconds). */
export const SCREEN_SHAKE_NORMAL_DURATION = 0.1;
/** Screen-shake intensity on kill. */
export const SCREEN_SHAKE_KILL_INTENSITY = 10;
/** Screen-shake duration on kill. */
export const SCREEN_SHAKE_KILL_DURATION = 0.25;
/** Hard cap on shake intensity. */
export const SCREEN_SHAKE_MAX_INTENSITY = 18;

export const DEFAULT_HIT_RUN_FEEDBACK_CONFIG: HitRunFeedbackConfig = {
  byCategory: {
    bullet: {
      hitStopSeconds: 0.03,
      shakeIntensity: 2.5,
      shakeDuration: 0.08,
      hitFlashFrames: 4
    },
    shotgun: {
      hitStopSeconds: 0.07,
      shakeIntensity: 8,
      shakeDuration: 0.18,
      hitFlashFrames: 6
    },
    explosive: {
      hitStopSeconds: 0.12,
      shakeIntensity: 14,
      shakeDuration: 0.35,
      hitFlashFrames: 8
    },
    melee: {
      hitStopSeconds: HIT_STOP_NORMAL_SECONDS,
      shakeIntensity: SCREEN_SHAKE_NORMAL_INTENSITY,
      shakeDuration: SCREEN_SHAKE_NORMAL_DURATION,
      hitFlashFrames: 5
    }
  },
  defaultHit: {
    hitStopSeconds: HIT_STOP_NORMAL_SECONDS,
    shakeIntensity: SCREEN_SHAKE_NORMAL_INTENSITY,
    shakeDuration: SCREEN_SHAKE_NORMAL_DURATION,
    hitFlashFrames: 4
  },
  death: {
    hitStopSeconds: HIT_STOP_KILL_SECONDS,
    shakeIntensity: SCREEN_SHAKE_KILL_INTENSITY,
    shakeDuration: SCREEN_SHAKE_KILL_DURATION,
    hitFlashFrames: 8
  },
  maxHitStopSeconds: HIT_STOP_MAX_SECONDS,
  maxShakeIntensity: SCREEN_SHAKE_MAX_INTENSITY
};
