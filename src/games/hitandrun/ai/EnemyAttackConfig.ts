/**
 * Centralized, data-driven attack configurations for Hit&Run enemies.
 * All durations are in simulation seconds (accumulated via deltaTime).
 */

export interface EnemyAttackTypeConfig {
  /** Frontal detection range (px) to trigger attack anticipation. */
  attackRange: number;
  /** Duration of anticipation warning phase (seconds). */
  anticipationSeconds: number;
  /** Duration of active attack phase (seconds). */
  activeSeconds: number;
  /** Duration of recovery phase when enemy is stationary/vulnerable (seconds). */
  recoverySeconds: number;
  /** Minimum delay before enemy can initiate another attack (seconds). */
  cooldownSeconds: number;
  /** Damage applied to victim. */
  damage: number;
  /** Hitbox width (px). */
  hitboxWidth: number;
  /** Hitbox height (px). */
  hitboxHeight: number;
  /** Hitbox offset X along facing direction (px). */
  hitboxOffsetX: number;
  /** Hitbox offset Y relative to origin (px). */
  hitboxOffsetY: number;
  /** Horizontal knockback impulse applied to victim (px/s). */
  knockbackX: number;
  /** Vertical knockback impulse applied to victim (px/s). */
  knockbackY: number;
  /** Warning visual color override during anticipation. */
  warningColor: string;
}

export interface PatrolEnemyAttackConfig extends EnemyAttackTypeConfig {
  /** Movement speed while patrolling (px/s). */
  patrolSpeed: number;
}

export interface ChargerEnemyAttackConfig extends EnemyAttackTypeConfig {
  /** Fixed horizontal speed during charge phase (px/s). */
  chargeSpeed: number;
  /** Maximum distance of charge before forcing recovery (px). */
  maxChargeDistance: number;
  /** Small backward/duck offset during anticipation (px). */
  windupBacktrackDistance: number;
}

export const DEFAULT_PATROL_ATTACK_CONFIG: PatrolEnemyAttackConfig = {
  attackRange: 40,
  anticipationSeconds: 0.4, // 400 ms (between 350ms and 500ms)
  activeSeconds: 0.2,
  recoverySeconds: 0.5,
  cooldownSeconds: 0.8,
  damage: 1,
  hitboxWidth: 26,
  hitboxHeight: 20,
  hitboxOffsetX: 18,
  hitboxOffsetY: 0,
  knockbackX: 180,
  knockbackY: 60,
  warningColor: "#fef08a",
  patrolSpeed: 60
};

export const DEFAULT_CHARGER_ATTACK_CONFIG: ChargerEnemyAttackConfig = {
  attackRange: 160,
  anticipationSeconds: 0.45,
  activeSeconds: 1.2,
  recoverySeconds: 1.0, // Long recovery where it is vulnerable
  cooldownSeconds: 1.5,
  damage: 1,
  hitboxWidth: 28,
  hitboxHeight: 22,
  hitboxOffsetX: 16,
  hitboxOffsetY: 0,
  knockbackX: 220,
  knockbackY: 80,
  warningColor: "#facc15",
  chargeSpeed: 280,
  maxChargeDistance: 320,
  windupBacktrackDistance: 12
};

export interface EnemyAttackCatalog {
  patrol: PatrolEnemyAttackConfig;
  charger: ChargerEnemyAttackConfig;
}

export const ENEMY_ATTACK_CATALOG: EnemyAttackCatalog = {
  patrol: DEFAULT_PATROL_ATTACK_CONFIG,
  charger: DEFAULT_CHARGER_ATTACK_CONFIG
};

export const ENEMY_ATTACK_CONFIG_RESOURCE = "EnemyAttackConfigCatalog";
