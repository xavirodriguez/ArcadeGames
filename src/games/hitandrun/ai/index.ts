export {
  resolveAIFromTags
} from "./behaviorTagResolver";
export type { HitRunMachineId, ResolvedEnemyAI } from "./behaviorTagResolver";

export { registerHitRunStateMachines } from "./hitRunStateMachines";
export { tryEnemyShoot, tickShootCooldown } from "./enemyShoot";
export { attachEnemyAI } from "./attachEnemyAI";
export type { AttachEnemyAIOptions } from "./attachEnemyAI";
export { HitRunShootCooldownSystem } from "./HitRunShootCooldownSystem";
export { registerHitRunAI } from "./registerHitRunAI";

export {
  DEFAULT_FLANK,
  pickFlankSide,
  flipFlankSide,
  computeFlankTarget,
  steerTowardFlank,
  isOnFlankAngle
} from "./flankingHelpers";
export type { FlankConfig, FlankTarget } from "./flankingHelpers";
