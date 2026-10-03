import { System, SystemPhase, World } from "@tiny-aster/core";
import type { TowerDefenseComponentRegistry } from "../types/TowerDefenseTypes";

/**
 * Steers tower projectiles toward their locked target.
 * If the target dies, the projectile continues on its last velocity until TTL / collision / boundary.
 */
export class ProjectileHomingSystem extends System<TowerDefenseComponentRegistry> {
  readonly phase = SystemPhase.Simulation;

  update(world: World<TowerDefenseComponentRegistry>, dt: number): void {
    const projectiles = world.query("TowerProjectile");

    for (const entity of projectiles) {
      const proj = world.getComponent(entity, "TowerProjectile");
      const transform = world.getComponent(entity, "Transform");
      if (!proj || !transform) continue;

      if (proj.targetEntity !== null && world.hasEntity(proj.targetEntity)) {
        const targetT = world.getComponent(proj.targetEntity, "Transform");
        if (targetT) {
          const dx = targetT.x - transform.x;
          const dy = targetT.y - transform.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > 0.1) {
            const speed = proj.speed;
            world.mutateComponent(entity, "Velocity", (v) => {
              v.vx = (dx / dist) * speed;
              v.vy = (dy / dist) * speed;
            });
          }
        }
      }

      // Integrate velocity
      const vel = world.getComponent(entity, "Velocity");
      if (vel) {
        world.mutateComponent(entity, "Transform", (t) => {
          t.x += vel.vx * (dt / 1000);
          t.y += vel.vy * (dt / 1000);
        });
      }
    }
  }
}
