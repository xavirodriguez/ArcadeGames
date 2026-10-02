import {
  SystemPhase,
  World,
  CoreComponentRegistry,
  StateMachineSystem,
  EnemySensorSystem
} from "@tiny-aster/core";
import { registerHitRunStateMachines } from "./hitRunStateMachines";
import { HitRunShootCooldownSystem } from "./HitRunShootCooldownSystem";

/**
 * Registra FSMs Hit&Run + StateMachineSystem + EnemySensorSystem + shoot cooldown.
 */
export function registerHitRunAI(world: World<CoreComponentRegistry>): void {
  registerHitRunStateMachines(world);

  // Evitar duplicar si el juego base ya los registró
  world.addSystem(new EnemySensorSystem(), {
    phase: SystemPhase.Simulation,
    priority: 15
  });
  world.addSystem(new StateMachineSystem(), {
    phase: SystemPhase.Simulation,
    priority: 16
  });
  world.addSystem(new HitRunShootCooldownSystem(), {
    phase: SystemPhase.Simulation,
    priority: 17
  });
}
