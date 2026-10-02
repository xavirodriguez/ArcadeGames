export {
  HitRunFeedbackSystem,
  isSimulationFrozen
} from "./HitRunFeedbackSystem";

export type {
  CombatHitPayload,
  CombatDeathPayload,
  HitStopRemaining,
  HitRunScreenShake,
  HitFeedbackProfile,
  HitRunFeedbackConfig
} from "./HitRunFeedbackTypes";

export {
  DEFAULT_HIT_RUN_FEEDBACK_CONFIG,
  HIT_STOP_NORMAL_SECONDS,
  HIT_STOP_KILL_SECONDS,
  HIT_STOP_MAX_SECONDS,
  SCREEN_SHAKE_NORMAL_INTENSITY,
  SCREEN_SHAKE_NORMAL_DURATION,
  SCREEN_SHAKE_KILL_INTENSITY,
  SCREEN_SHAKE_KILL_DURATION,
  SCREEN_SHAKE_MAX_INTENSITY
} from "./HitRunFeedbackTypes";

export { registerHitRunFeedback } from "./registerHitRunFeedback";
