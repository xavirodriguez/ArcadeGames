import { System, SystemPhase, World } from "@tiny-aster/core";
import type { TowerDefenseComponentRegistry } from "../types/TowerDefenseTypes";
import type { TowerDefenseConfig } from "../types/TowerDefenseConfigSchema";
import type { TowerProjectilePool } from "../EntityPool";

/**
 * Fires projectiles at the current target when cooldown allows.
 * Projectiles are spawned via the pool / EntityFactory and carry Damage + Faction.
 * Impact resolution is left to CollisionSystem2D (same as Space Invaders bullets).
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

    const towers = world.query("Tower");

    for (const towerEntity of towers) {
      const tower = world.getComponent(towerEntity, "Tower");
      const transform = world.getComponent(towerEntity, "Transform");
      if (!tower || !transform) continue;

      // Tick cooldown
      if (tower.cooldownRemaining > 0) {
        world.mutateComponent(towerEntity, "Tower", (t) => {
          t.cooldownRemaining = Math.max(0, t.cooldownRemaining - dt);
        });
        continue;
      }

      if (tower.targetEntity === null) continue;

      // Validate target still exists and has Creep
      if (!world.hasEntity(tower.targetEntity) || !world.hasComponent(tower.targetEntity, "Creep")) {
        world.mutateComponent(towerEntity, "Tower", (t) => {
          t.targetEntity = null;
        });
        continue;
      }

      // Fire
      this.pool.acquire(
        world,
        config,
        transform.x,
        transform.y,
        tower.targetEntity,
        tower.damage,
        tower.projectileSpeed
      );

      // Reset cooldown (fireRate is shots/sec → cooldown in ms)
      const cooldownMs = 1000 / tower.fireRate;
      world.mutateComponent(towerEntity, "Tower", (t) => {
        t.cooldownRemaining = cooldownMs;
      });
    }
  }
}
