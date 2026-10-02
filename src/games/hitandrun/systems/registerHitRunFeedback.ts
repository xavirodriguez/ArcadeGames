import {
  SystemPhase,
  World,
  CoreComponentRegistry,
  ScreenShakeSystem
} from "@tiny-aster/core";
import {
  HitRunFeedbackSystem,
  DEFAULT_HIT_RUN_FEEDBACK_CONFIG,
  type HitRunFeedbackConfig
} from "./index";

/**
 * Registers HitRunFeedbackSystem + ScreenShakeSystem + resources.
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

  // Presentation: applies VisualOffset on main camera from ScreenShake components.
  world.addSystem(new ScreenShakeSystem(), {
    phase: SystemPhase.Presentation,
    priority: 5
  });

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
