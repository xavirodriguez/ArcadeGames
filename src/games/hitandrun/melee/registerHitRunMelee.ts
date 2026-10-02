import { SystemPhase, World, CoreComponentRegistry } from "@tiny-aster/core";
import { HitRunMeleeSystem } from "./HitRunMeleeSystem";
import {
  DEFAULT_MELEE_ATTACK_CONFIG,
  type MeleeAttackConfig
} from "./MeleeAttackTypes";

const MELEE_CONFIG_RESOURCE = "MeleeAttackConfig";

/**
 * Registers melee config resource + HitRunMeleeSystem.
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

  const system = new HitRunMeleeSystem();
  // After collision broadphase/narrowphase typically; before or after CombatSystem
  // we resolve melee hits inside this system (one-hit guarantee).
  world.addSystem(system, { phase: SystemPhase.Simulation, priority: 30 });
  return system;
}
