import type { Entity } from "@tiny-aster/core";

/** Payload emitido por CombatSystem (emitDeferred). */
export interface CombatHitPayload {
  targetEntity: Entity;
  sourceEntity: Entity;
  amount: number;
  remainingHealth: number;
  category?: string;
}

export interface CombatDeathPayload {
  entity: Entity;
  sourceEntity: Entity;
  category?: string;
}

/**
 * Hit-stop global. La simulación lo lee; HitRunFeedbackSystem lo decrementa.
 * Resource key: "HitStopRemaining" (number, segundos).
 */
export type HitStopRemaining = number;

/**
 * Screen-shake singleton de presentación.
 * Resource key: "HitRunScreenShake"
 *
 * La capa de render calcula el offset con renderRandom/Math.random;
 * este resource solo guarda intensity/duration/elapsed.
 */
export interface HitRunScreenShake {
  intensity: number;
  duration: number;
  elapsed: number;
}

/** Tabla data-driven: category de daño → feedback. */
export interface HitFeedbackProfile {
  hitStopSeconds: number;
  shakeIntensity: number;
  shakeDuration: number;
  hitFlashFrames: number;
}

export interface HitRunFeedbackConfig {
  /** Feedback por categoría de DamageComponent.category */
  byCategory: Record<string, HitFeedbackProfile>;
  /** Fallback si category no está en la tabla */
  defaultHit: HitFeedbackProfile;
  /** Feedback específico de muerte */
  death: HitFeedbackProfile;
  /** Tope de hit-stop apilado (evita freezes eternos en combos) */
  maxHitStopSeconds: number;
  /** Tope de intensidad de shake */
  maxShakeIntensity: number;
}

export const DEFAULT_HIT_RUN_FEEDBACK_CONFIG: HitRunFeedbackConfig = {
  byCategory: {
    // Metal Slug feel: balas rápidas = poco freeze, flash corto
    bullet: {
      hitStopSeconds: 0.03,
      shakeIntensity: 2.5,
      shakeDuration: 0.08,
      hitFlashFrames: 4
    },
    // Escopeta / impacto pesado
    shotgun: {
      hitStopSeconds: 0.07,
      shakeIntensity: 8,
      shakeDuration: 0.18,
      hitFlashFrames: 6
    },
    // Cohete / explosión
    explosive: {
      hitStopSeconds: 0.12,
      shakeIntensity: 14,
      shakeDuration: 0.35,
      hitFlashFrames: 8
    },
    // Contacto cuerpo a cuerpo / kamikaze
    melee: {
      hitStopSeconds: 0.05,
      shakeIntensity: 5,
      shakeDuration: 0.12,
      hitFlashFrames: 5
    }
  },
  defaultHit: {
    hitStopSeconds: 0.04,
    shakeIntensity: 3,
    shakeDuration: 0.1,
    hitFlashFrames: 4
  },
  death: {
    hitStopSeconds: 0.1,
    shakeIntensity: 10,
    shakeDuration: 0.25,
    hitFlashFrames: 8
  },
  maxHitStopSeconds: 0.2,
  maxShakeIntensity: 18
};
