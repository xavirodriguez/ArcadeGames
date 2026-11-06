/**
 * Knockback, hitstun, stagger, invulnerability (player).
 * Durations use simulation seconds (deltaTime), never wall-clock time.
 */

export const PLAYER_KNOCKBACK_X = 220;
export const PLAYER_KNOCKBACK_Y = 90;
export const ENEMY_KNOCKBACK_X = 200;
export const ENEMY_KNOCKBACK_Y = 70;
export const PLAYER_INVULN_SECONDS = 1.0;
export const PLAYER_HITSTUN_SECONDS = 0.12;
export const ENEMY_HITSTUN_SECONDS = 0.14;
export const PLAYER_INVULN_BLINK_HALF_PERIOD = 0.08;
export const ENEMY_STAGGER_SECONDS = 0.32;
export const HEAVY_HIT_STAGGER_SECONDS = 0.42;

export interface HitReactionConfig {
  playerKnockbackX: number;
  playerKnockbackY: number;
  enemyKnockbackX: number;
  enemyKnockbackY: number;
  playerInvulnSeconds: number;
  playerHitstunSeconds: number;
  enemyHitstunSeconds: number;
  enemyStaggerSeconds: number;
  heavyHitStaggerSeconds: number;
  staggerDamageThreshold: number;
  blinkHalfPeriod: number;
}

export const DEFAULT_HIT_REACTION_CONFIG: HitReactionConfig = {
  playerKnockbackX: PLAYER_KNOCKBACK_X,
  playerKnockbackY: PLAYER_KNOCKBACK_Y,
  enemyKnockbackX: ENEMY_KNOCKBACK_X,
  enemyKnockbackY: ENEMY_KNOCKBACK_Y,
  playerInvulnSeconds: PLAYER_INVULN_SECONDS,
  playerHitstunSeconds: PLAYER_HITSTUN_SECONDS,
  enemyHitstunSeconds: ENEMY_HITSTUN_SECONDS,
  enemyStaggerSeconds: ENEMY_STAGGER_SECONDS,
  heavyHitStaggerSeconds: HEAVY_HIT_STAGGER_SECONDS,
  staggerDamageThreshold: 2.5,
  blinkHalfPeriod: PLAYER_INVULN_BLINK_HALF_PERIOD
};

export interface HitReactionInput {
  readonly amount: number;
  readonly category?: string;
  readonly attackCategory?: string;
  readonly hitstunSeconds?: number;
  readonly staggerSeconds?: number;
}

/** One shared resolver keeps gameplay reaction timing and its VFX semantics aligned. */
export function resolveHitReactionDurations(
  hit: HitReactionInput,
  isPlayer: boolean,
  config: HitReactionConfig
): { hitstunSeconds: number; staggerSeconds: number } {
  const baseHitstun = isPlayer
    ? config.playerHitstunSeconds
    : config.enemyHitstunSeconds;
  const isHeavy = hit.attackCategory === "combo-finisher" ||
    hit.attackCategory === "throw" ||
    hit.attackCategory === "special" ||
    hit.category === "guard-break";
  const exceedsPoiseThreshold = hit.amount >= config.staggerDamageThreshold;
  const staggerSeconds = hit.staggerSeconds ??
    (isHeavy
      ? config.heavyHitStaggerSeconds
      : exceedsPoiseThreshold && !isPlayer
        ? config.enemyStaggerSeconds
        : 0);
  return {
    hitstunSeconds: hit.hitstunSeconds ?? baseHitstun,
    staggerSeconds
  };
}

export interface HitReactionComponent {
  type: "HitReaction";
  hitstunRemaining: number;
  /** Extra control/mobility lock from a stability-breaking impact. */
  staggerRemaining?: number;
  blinkElapsed: number;
}

export const HIT_REACTION_CONFIG_RESOURCE = "HitReactionConfig";
