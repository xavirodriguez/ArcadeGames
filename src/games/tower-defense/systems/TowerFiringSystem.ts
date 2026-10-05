import { System, SystemPhase, World } from "@tiny-aster/core";
import type { TowerDefenseComponentRegistry, TowerDefenseEventRegistry, TowerCatalog } from "../types/TowerDefenseTypes";
import type { TowerDefenseConfig } from "../types/TowerDefenseConfigSchema";
import type { TowerProjectilePool } from "../EntityPool";

/**
 * Fires projectiles at the current target when cooldown allows.
 * Frost towers attach slow payload to projectiles.
 * Uses world.commands to spawn projectiles safely during simulation update.
 */
export class TowerFiringSystem extends System<TowerDefenseComponentRegistry, TowerDefenseEventRegistry> {
  readonly phase = SystemPhase.Simulation;
  private pool: TowerProjectilePool;

  constructor(pool: TowerProjectilePool) {
    super();
    this.pool = pool;
  }

  update(world: World<TowerDefenseComponentRegistry, TowerDefenseEventRegistry>, dt: number): void {
    const config = world.getResource<TowerDefenseConfig>("GameConfig");
    if (!config) return;
    const catalog = world.getResource<TowerCatalog>("TowerCatalog");

    const towers = world.query("Tower");

    for (const towerEntity of towers) {
      const tower = world.getComponent(towerEntity, "Tower");
      const transform = world.getComponent(towerEntity, "Transform");
      if (!tower || !transform) continue;

      if (tower.cooldownRemaining > 0) {
        world.mutateComponent(towerEntity, "Tower", (t) => {
          t.cooldownRemaining = Math.max(0, t.cooldownRemaining - dt);
        });
        continue;
      }

      if (tower.targetEntity === null) continue;

      if (!world.hasEntity(tower.targetEntity) || !world.hasComponent(tower.targetEntity, "Creep")) {
        world.mutateComponent(towerEntity, "Tower", (t) => {
          t.targetEntity = null;
        });
        continue;
      }

      const def = catalog?.[tower.towerType] as
        | { slowFactor?: number; slowDurationMs?: number }
        | undefined;
      const slow =
        def?.slowFactor && def?.slowDurationMs
          ? { factor: def.slowFactor, durationMs: def.slowDurationMs }
          : undefined;

      world.commands.spawnFromBlueprint("tower_projectile", {
        x: transform.x,
        y: transform.y,
        targetEntity: tower.targetEntity,
        damage: tower.damage,
        speed: tower.projectileSpeed,
        slowFactor: slow?.factor,
        slowDurationMs: slow?.durationMs,
      });

      const bus = world.getEventBus();
      if (bus && !(world as any).isReSimulating) {
        bus.emitDeferred?.("PlaySFX", { name: "shoot" }) ?? bus.emit?.("PlaySFX", { name: "shoot" });
      }

      const cooldownSec = 1.0 / tower.fireRate;
      world.mutateComponent(towerEntity, "Tower", (t) => {
        t.cooldownRemaining = cooldownSec;
      });
    }
  }
}
