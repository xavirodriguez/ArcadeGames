export type {
  HitReactionConfig,
  HitReactionComponent
} from "./HitReactionTypes";

export {
  DEFAULT_HIT_REACTION_CONFIG,
  HIT_REACTION_CONFIG_RESOURCE,
  PLAYER_KNOCKBACK_X,
  PLAYER_KNOCKBACK_Y,
  ENEMY_KNOCKBACK_X,
  ENEMY_KNOCKBACK_Y,
  PLAYER_INVULN_SECONDS,
  PLAYER_HITSTUN_SECONDS,
  PLAYER_INVULN_BLINK_HALF_PERIOD
} from "./HitReactionTypes";

export {
  HitRunHurtSystem,
  isPlayerControlLocked,
  canTakeDamage
} from "./HitRunHurtSystem";

export { registerHitRunHurt } from "./registerHitRunHurt";
