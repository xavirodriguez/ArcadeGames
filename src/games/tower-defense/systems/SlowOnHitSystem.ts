import { System, SystemPhase, World } from "@tiny-aster/core";
import type { TowerDefenseComponentRegistry, TowerDefenseEventRegistry } from "../types/TowerDefenseTypes";

/**
 * On combat:hit, if the attacker is a frost projectile, apply slow to the creep.
 */
// TODO(refactor): código duplicado detectado (bloque) con tower-defense/systems/TowerDefenseAudioSystem.ts:19-30. Considerar extraer a función compartida. Ref: 962c52b6
export class SlowOnHitSystem extends System<TowerDefenseComponentRegistry, TowerDefenseEventRegistry> {
  readonly phase = SystemPhase.GameRules;
  private bound = false;

  update(world: World<TowerDefenseComponentRegistry, TowerDefenseEventRegistry>, _dt: number): void {
    if (!this.bound) {
      this.bind(world);
      this.bound = true;
    }
  }

  private bind(world: World<TowerDefenseComponentRegistry, TowerDefenseEventRegistry>): void {
    const bus = world.getEventBus();
    if (!bus?.on) return;

    bus.on("combat:hit", (ev) => {
      if (!ev.sourceEntity) return;
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
