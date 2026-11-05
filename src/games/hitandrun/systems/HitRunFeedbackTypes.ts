import type { Entity } from "@tiny-aster/core";

/** Resolved impact event shared by gameplay reactions and presentation. */
export interface CombatHitPayload {
  targetEntity: Entity;
  sourceEntity?: Entity;
  attackerEntity?: Entity;
  amount: number;
  remainingHealth: number;
  category?: string;
  attackCategory?: string;
  guardBroken?: boolean;
  guardRecovered?: boolean;
  armorBroken?: boolean;
  armorHit?: boolean;
  armorAbsorbed?: number;
  blocked?: boolean;
  /** Magnitudes supplied by the originating attack; direction is resolved from source/target. */
  knockbackX?: number;
  knockbackY?: number;
  hitstunSeconds?: number;
  staggerSeconds?: number;
}

export interface CombatDeathPayload {
  entity: Entity;
  sourceEntity?: Entity;
  category?: string;
}

/** Presentation mirror resource (optional readers). */
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

/** Hit-stop on a normal (non-lethal) hit — starting feel value. */
export const HIT_STOP_NORMAL_SECONDS = 0.045;
/** Hit-stop when the hit kills (combat:death) — longer freeze. */
export const HIT_STOP_KILL_SECONDS = 0.1;
/** Cap so combos cannot freeze the sim indefinitely. */
export const HIT_STOP_MAX_SECONDS = 0.2;
export const SCREEN_SHAKE_NORMAL_INTENSITY = 4;
export const SCREEN_SHAKE_NORMAL_DURATION = 0.1;
export const SCREEN_SHAKE_KILL_INTENSITY = 10;
export const SCREEN_SHAKE_KILL_DURATION = 0.25;
export const SCREEN_SHAKE_MAX_INTENSITY = 18;

export const DEFAULT_HIT_RUN_FEEDBACK_CONFIG: HitRunFeedbackConfig = {
  byCategory: {
    bullet: {
      hitStopSeconds: 0.025,
      shakeIntensity: 2.5,
      shakeDuration: 0.08,
      hitFlashFrames: 4
    },
    shotgun: {
      hitStopSeconds: 0.055,
      shakeIntensity: 8,
      shakeDuration: 0.18,
      hitFlashFrames: 6
    },
    explosive: {
      hitStopSeconds: 0.09,
      shakeIntensity: 14,
      shakeDuration: 0.35,
      hitFlashFrames: 8
    },
    melee: {
      hitStopSeconds: HIT_STOP_NORMAL_SECONDS,
      shakeIntensity: SCREEN_SHAKE_NORMAL_INTENSITY,
      shakeDuration: SCREEN_SHAKE_NORMAL_DURATION,
      hitFlashFrames: 5
    },
    "combo-finisher": {
      hitStopSeconds: 0.075,
      shakeIntensity: 8,
      shakeDuration: 0.16,
      hitFlashFrames: 7
    },
    throw: {
      hitStopSeconds: 0.065,
      shakeIntensity: 7,
      shakeDuration: 0.15,
      hitFlashFrames: 6
    },
    special: {
      hitStopSeconds: 0.085,
      shakeIntensity: 10,
      shakeDuration: 0.2,
      hitFlashFrames: 7
    },
    "guard-break": {
      hitStopSeconds: 0.07,
      shakeIntensity: 7,
      shakeDuration: 0.14,
      hitFlashFrames: 6
    },
    "armor-break": {
      hitStopSeconds: 0.06,
      shakeIntensity: 6,
      shakeDuration: 0.13,
      hitFlashFrames: 6
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
