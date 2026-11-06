import { System, World, CoreComponentRegistry } from "@tiny-aster/core";
import { tickHitRunCombatDefense } from "./HitRunCombatDefense";

/** Advances guard-break recovery and guard regeneration in simulation time. */
export class HitRunCombatDefenseSystem extends System<CoreComponentRegistry> {
  public update(world: World<CoreComponentRegistry>, deltaTime: number): void {
    if (world.getResource("IsPaused") === true) return;

    const entities = world.query("CombatDefense" as never);
    const bus = world.getEventBus();
    for (let i = 0; i < entities.length; i++) {
      const defense = world.getComponent(entities[i], "CombatDefense" as never) as
        | { guardBreakRemaining: number }
        | undefined;
      const wasBroken = (defense?.guardBreakRemaining ?? 0) > 0;
      if (!wasBroken) continue;

      const next = Math.max(0, defense!.guardBreakRemaining - Math.max(0, deltaTime));
      if (next === 0 && bus) {
        const health = world.getComponent(entities[i], "Health") as
          | { current?: number }
          | undefined;
        bus.emitDeferred("combat:hit", {
          targetEntity: entities[i],
          amount: 0,
          remainingHealth: health?.current ?? 0,
          category: "guard-recovered",
          guardRecovered: true
        });
      }
    }

    tickHitRunCombatDefense(world, deltaTime);
  }
}
