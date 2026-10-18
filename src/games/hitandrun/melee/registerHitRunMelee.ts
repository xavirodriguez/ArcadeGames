import { SystemPhase, World, CoreComponentRegistry } from "@tiny-aster/core";
import { HitRunMeleeSystem } from "./HitRunMeleeSystem";
import { ComboMeleeSystem } from "./ComboMeleeSystem";
import {
  DEFAULT_MELEE_ATTACK_CONFIG,
  type MeleeAttackConfig
} from "./MeleeAttackTypes";

const MELEE_CONFIG_RESOURCE = "MeleeAttackConfig";

/**
 * Registers melee config resource + ComboMeleeSystem + HitRunMeleeSystem.
 * Call from HitAndRunGame.onRegisterSystems().
 */
export function registerHitRunMelee(
  world: World<CoreComponentRegistry>,
  config: Partial<MeleeAttackConfig> = {}
): HitRunMeleeSystem {
  const merged: MeleeAttackConfig = {
    ...DEFAULT_MELEE_ATTACK_CONFIG,
    ...config
  };
  world.setResource(MELEE_CONFIG_RESOURCE, merged);

  // Combo resolves jab/throw/special and sets customConfig before the swing
  world.addSystem(new ComboMeleeSystem(), {
    phase: SystemPhase.Simulation,
    priority: 28
  });

  const system = new HitRunMeleeSystem();
  world.addSystem(system, { phase: SystemPhase.Simulation, priority: 30 });
  return system;
}
