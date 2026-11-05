import { SystemPhase, World, CoreComponentRegistry } from "@tiny-aster/core";
import { HitRunHurtSystem } from "./HitRunHurtSystem";
import { HitRunStaggerSystem } from "./HitRunStaggerSystem";
import {
  DEFAULT_HIT_REACTION_CONFIG,
  HIT_REACTION_CONFIG_RESOURCE,
  type HitReactionConfig
} from "./HitReactionTypes";

export function registerHitRunHurt(
  world: World<CoreComponentRegistry>,
  config: Partial<HitReactionConfig> = {}
): HitRunHurtSystem {
  const merged: HitReactionConfig = {
    ...DEFAULT_HIT_REACTION_CONFIG,
    ...config
  };
  world.setResource(HIT_REACTION_CONFIG_RESOURCE, merged);

  const system = new HitRunHurtSystem();
  world.addSystem(system, { phase: SystemPhase.GameRules, priority: 15 });
  // Enemy FSMs run at Simulation priority 16; this final pass enforces stagger
  // after their steering writes velocity.
  world.addSystem(new HitRunStaggerSystem(), {
    phase: SystemPhase.Simulation,
    priority: 18
  });

  const bus = world.getEventBus();
  if (bus) {
    system.subscribe(bus);
  }

  return system;
}
