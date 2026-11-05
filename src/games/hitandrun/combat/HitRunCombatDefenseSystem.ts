import { System, World, CoreComponentRegistry } from "@tiny-aster/core";
import { tickHitRunCombatDefense } from "./HitRunCombatDefense";

/** Advances guard-break recovery and guard regeneration in simulation time. */
export class HitRunCombatDefenseSystem extends System<CoreComponentRegistry> {
  public update(world: World<CoreComponentRegistry>, deltaTime: number): void {
    if (world.getResource("IsPaused") === true) return;
    tickHitRunCombatDefense(world, deltaTime);
  }
}
