/**
 * Paso C — knockback, hitstun, invulnerability (player).
 * Durations in simulation seconds (deltaTime), never Date.now.
 */

/** Horizontal knockback impulse magnitude when the player is hit (px/s). */
export const PLAYER_KNOCKBACK_X = 220;
/** Upward knockback impulse when the player is hit (px/s). */
export const PLAYER_KNOCKBACK_Y = 90;

/** Horizontal knockback for normal enemies (px/s). */
export const ENEMY_KNOCKBACK_X = 160;
/** Upward knockback for normal enemies (px/s). */
export const ENEMY_KNOCKBACK_Y = 50;

/** Player invulnerability after taking damage (seconds). */
export const PLAYER_INVULN_SECONDS = 1.0;
/** Player movement/input lock after taking damage (seconds). */
export const PLAYER_HITSTUN_SECONDS = 0.12;

/** Blink period while invulnerable (seconds per half-cycle). */
export const PLAYER_INVULN_BLINK_HALF_PERIOD = 0.08;

export interface HitReactionConfig {
  playerKnockbackX: number;
  playerKnockbackY: number;
  enemyKnockbackX: number;
  enemyKnockbackY: number;
  playerInvulnSeconds: number;
  playerHitstunSeconds: number;
  blinkHalfPeriod: number;
}

export const DEFAULT_HIT_REACTION_CONFIG: HitReactionConfig = {
  playerKnockbackX: PLAYER_KNOCKBACK_X,
  playerKnockbackY: PLAYER_KNOCKBACK_Y,
  enemyKnockbackX: ENEMY_KNOCKBACK_X,
  enemyKnockbackY: ENEMY_KNOCKBACK_Y,
  playerInvulnSeconds: PLAYER_INVULN_SECONDS,
  playerHitstunSeconds: PLAYER_HITSTUN_SECONDS,
  blinkHalfPeriod: PLAYER_INVULN_BLINK_HALF_PERIOD
};

/**
 * Per-entity reaction state (player and optionally elites later).
 * hitstunRemaining > 0 → movement systems should ignore horizontal input.
 */
export interface HitReactionComponent {
  type: "HitReaction";
  hitstunRemaining: number;
  /** Accumulator for blink phase (seconds). */
  blinkElapsed: number;
}

export const HIT_REACTION_CONFIG_RESOURCE = "HitReactionConfig";
