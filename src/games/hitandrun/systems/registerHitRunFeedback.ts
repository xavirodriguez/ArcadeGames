import { SystemPhase, World, CoreComponentRegistry } from "@tiny-aster/core";
import {
  HitRunFeedbackSystem,
  DEFAULT_HIT_RUN_FEEDBACK_CONFIG,
  type HitRunFeedbackConfig
} from "./index";

/**
 * Registra HitRunFeedbackSystem + recursos iniciales en el world.
 * Llamar desde HitAndRunGame.onRegisterSystems().
 */
export function registerHitRunFeedback(
  world: World<CoreComponentRegistry>,
  config: Partial<HitRunFeedbackConfig> = {}
): HitRunFeedbackSystem {
  const feedback = new HitRunFeedbackSystem({
    ...DEFAULT_HIT_RUN_FEEDBACK_CONFIG,
    ...config
  });

  world.addSystem(feedback, { phase: SystemPhase.GameRules, priority: 10 });

  const bus = world.getEventBus();
  if (bus) {
    feedback.subscribe(bus);
  }

  world.setResource("HitStopRemaining", 0);
  world.setResource("HitRunScreenShake", {
    intensity: 0,
    duration: 0,
    elapsed: 0
  });

  return feedback;
}
