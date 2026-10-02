export type {
  MeleePhase,
  MeleeAttackConfig,
  MeleeAttackComponent,
  MeleeAttackInput
} from "./MeleeAttackTypes";

export {
  DEFAULT_MELEE_ATTACK_CONFIG,
  MELEE_STARTUP_SECONDS,
  MELEE_ACTIVE_SECONDS,
  MELEE_RECOVERY_SECONDS,
  MELEE_DAMAGE,
  MELEE_HITBOX_WIDTH,
  MELEE_HITBOX_HEIGHT,
  MELEE_HITBOX_OFFSET_X,
  MELEE_HITBOX_OFFSET_Y,
  MELEE_KNOCKBACK_X,
  MELEE_KNOCKBACK_Y,
  MELEE_MAX_HITS_PER_SWING
} from "./MeleeAttackTypes";

export {
  HitRunMeleeSystem,
  isMeleeAttackLocked,
  createMeleeAttackComponent
} from "./HitRunMeleeSystem";

export { registerHitRunMelee } from "./registerHitRunMelee";
