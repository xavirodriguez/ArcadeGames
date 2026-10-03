import { System, SystemPhase, World } from "@tiny-aster/core";
import type { TowerDefenseComponentRegistry, TowerCatalog } from "../types/TowerDefenseTypes";
import type { TowerDefenseConfig } from "../types/TowerDefenseConfigSchema";
import type { TowerProjectilePool } from "../EntityPool";

/**
 * Fires projectiles at the current target when cooldown allows.
 * Frost towers attach slow payload to projectiles.
 */
export class TowerFiringSystem extends System<TowerDefenseComponentRegistry> {
  readonly phase = SystemPhase.Simulation;
  private pool: TowerProjectilePool;

  constructor(pool: TowerProjectilePool) {
    super();
    this.pool = pool;
  }

  update(world: World<TowerDefenseComponentRegistry>, dt: number): void {
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

      this.pool.acquire(
        world,
        config,
        transform.x,
        transform.y,
        tower.targetEntity,
        tower.damage,
        tower.projectileSpeed,
        slow
      );

      const bus = world.getEventBus?.() ?? (world as any).eventBus;
      if (bus && !(world as any).isReSimulating) {
        bus.emitDeferred?.("PlaySFX", { name: "shoot" }) ?? bus.emit?.("PlaySFX", { name: "shoot" });
      }

      const cooldownMs = 1000 / tower.fireRate;
      world.mutateComponent(towerEntity, "Tower", (t) => {
        t.cooldownRemaining = cooldownMs;
      });
    }
  }
}
