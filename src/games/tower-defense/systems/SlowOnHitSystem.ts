import { SystemPhase, World } from "@tiny-aster/core";
import type { TowerDefenseComponentRegistry, TowerDefenseEventRegistry } from "../types/TowerDefenseTypes";
import { TowerDefenseEventBindingSystem } from "./TowerDefenseSystemUtils";

/**
 * On combat:hit, if the attacker is a frost projectile, apply slow to the creep.
 */
export class SlowOnHitSystem extends TowerDefenseEventBindingSystem {
  readonly phase = SystemPhase.GameRules;

  protected override bindEvents(world: World<TowerDefenseComponentRegistry, TowerDefenseEventRegistry>): void {
    const bus = world.getEventBus();
    if (!bus?.on) return;

    bus.on("combat:hit", (ev) => {
      if (world.hasComponent(ev.targetEntity, "Creep")) {
        world.mutateComponent(ev.targetEntity, "Render", (render) => {
          render.hitFlashFrames = Math.max(render.hitFlashFrames ?? 0, 5);
        });
      }

      if (ev.sourceEntity === undefined) return;
      const proj = world.getComponent(ev.sourceEntity, "TowerProjectile");
      if (!proj?.slowFactor || !proj.slowDurationMs) return;
      if (!world.hasComponent(ev.targetEntity, "Creep")) return;

      world.mutateComponent(ev.targetEntity, "Creep", (c) => {
        c.slowFactor = Math.min(c.slowFactor || 1, proj.slowFactor!);
        c.slowRemainingMs = Math.max(c.slowRemainingMs || 0, proj.slowDurationMs!);
        c.speed = c.baseSpeed * c.slowFactor;
      });
    });
  }
}
