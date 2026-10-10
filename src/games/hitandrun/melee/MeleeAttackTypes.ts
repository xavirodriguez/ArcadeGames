/**
 * Data-driven melee (sword) attack for Hit&Run.
 * Durations are simulation seconds (accumulate deltaTime) — never Date.now / Math.random.
 */

export type MeleePhase = "idle" | "startup" | "active" | "recovery";

/**
 * Tunable constants — starting values for feel; adjust by hand.
 * Measured in seconds of simulation time.
 */
export const MELEE_STARTUP_SECONDS = 0.06;
export const MELEE_ACTIVE_SECONDS = 0.1;
export const MELEE_RECOVERY_SECONDS = 0.18;

export const MELEE_DAMAGE = 2;
export const MELEE_HITBOX_WIDTH = 28;
export const MELEE_HITBOX_HEIGHT = 20;
/** Offset from player origin along facing (px). */
export const MELEE_HITBOX_OFFSET_X = 22;
export const MELEE_HITBOX_OFFSET_Y = 0;

/** Horizontal knockback applied to victims (px/s impulse magnitude). */
export const MELEE_KNOCKBACK_X = 180;
/** Vertical upward impulse on victims (px/s along elevation Z axis). */
export const MELEE_KNOCKBACK_Y = 160;

/** Max distinct enemies tracked as hit during one swing (fixed buffer, no heap growth). */
export const MELEE_MAX_HITS_PER_SWING = 8;

export interface MeleeAttackConfig {
  startupSeconds: number;
  activeSeconds: number;
  recoverySeconds: number;
  damage: number;
  hitboxWidth: number;
  hitboxHeight: number;
  hitboxOffsetX: number;
  hitboxOffsetY: number;
  halfDepth: number;
  knockbackX: number;
  knockbackY: number;
  /** DamageComponent.category → juice profiles. */
  damageCategory: string;
}

export const DEFAULT_MELEE_ATTACK_CONFIG: MeleeAttackConfig = {
  startupSeconds: MELEE_STARTUP_SECONDS,
  activeSeconds: MELEE_ACTIVE_SECONDS,
  recoverySeconds: MELEE_RECOVERY_SECONDS,
  damage: MELEE_DAMAGE,
  hitboxWidth: MELEE_HITBOX_WIDTH,
  hitboxHeight: MELEE_HITBOX_HEIGHT,
  hitboxOffsetX: MELEE_HITBOX_OFFSET_X,
  hitboxOffsetY: MELEE_HITBOX_OFFSET_Y,
  halfDepth: 20,
  knockbackX: MELEE_KNOCKBACK_X,
  knockbackY: MELEE_KNOCKBACK_Y,
  damageCategory: "melee"
};

/**
 * Per-entity melee state. Attached to player or enemy.
 * hitEntityIds is a fixed-capacity list for the current swing (rollback-friendly).
 */
export interface MeleeAttackComponent {
  type: "MeleeAttack";
  phase: MeleePhase;
  /** Elapsed time in the current phase (seconds). */
  phaseElapsed: number;
  /** Entity id of the active hitbox, or -1 if none. */
  hitboxEntity: number;
  /** Count of valid entries in hitEntityIds. */
  hitCount: number;
  /** Entities already damaged this swing. */
  hitEntityIds: number[];
  /** Facing locked at swing start: 1 | -1. */
  facing: number;
  /** Optional override config id; systems read resource MeleeAttackConfig if unset. */
  configId?: string;
  /** Custom attack config override for enemies or special weapons. */
  customConfig?: MeleeAttackConfig;
  /** Base color restored when leaving anticipation/startup phase. */
  baseColor?: string;
  /** Warning visual color during anticipation/startup phase. */
  warningColor?: string;
  /** Owner faction override (e.g. "player" or "enemy"). */
  ownerFaction?: string;
}

/** Input fields expected on PlatformerInput (or dedicated attack buffer). */
export interface MeleeAttackInput {
  attackPressed?: boolean;
  attackHeld?: boolean;
}
