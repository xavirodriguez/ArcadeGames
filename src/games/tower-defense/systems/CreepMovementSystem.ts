import { System, SystemPhase, World } from "@tiny-aster/core";
import type { TowerDefenseComponentRegistry, WaypointList, GameStateComponent } from "../types/TowerDefenseTypes";

/**
 * Moves each creep toward the next waypoint.
 * Purely deterministic — no RNG.
 * When a creep reaches the final waypoint it damages the base (lives--) and is destroyed.
 */
export class CreepMovementSystem extends System<TowerDefenseComponentRegistry> {
  readonly phase = SystemPhase.Simulation;

  update(world: World<TowerDefenseComponentRegistry>, dt: number): void {
    const waypoints = world.getResource<WaypointList>("WaypointList");
    if (!waypoints || waypoints.points.length === 0) return;

    const points = waypoints.points;
    const creeps = world.query("Creep");

    for (const entity of creeps) {
      const creep = world.getComponent(entity, "Creep");
      const transform = world.getComponent(entity, "Transform");
      if (!creep || !transform) continue;

      if (creep.waypointIndex >= points.length) {
        // Reached base
        this.reachBase(world, entity);
        continue;
      }

      const target = points[creep.waypointIndex];
      const dx = target.x - transform.x;
      const dy = target.y - transform.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 2) {
        // Snap and advance
        world.mutateComponent(entity, "Transform", (t) => {
          t.x = target.x;
          t.y = target.y;
        });
        world.mutateComponent(entity, "Creep", (c) => {
          c.waypointIndex += 1;
          c.pathProgress = c.waypointIndex / points.length;
        });
        if (creep.waypointIndex + 1 >= points.length) {
          this.reachBase(world, entity);
        }
        continue;
      }

      const speed = creep.speed;
      const step = Math.min(speed * (dt / 1000), dist);
      const nx = dx / dist;
      const ny = dy / dist;

      world.mutateComponent(entity, "Transform", (t) => {
        t.x += nx * step;
        t.y += ny * step;
      });

      // Update progress for targeting priority
      const segmentProgress = 1 - dist / (dist + step); // approximate
      world.mutateComponent(entity, "Creep", (c) => {
        c.pathProgress = (c.waypointIndex + segmentProgress) / points.length;
      });

      // Also update Velocity for any systems that read it
      world.mutateComponent(entity, "Velocity", (v) => {
        v.vx = nx * speed;
        v.vy = ny * speed;
      });
    }
  }

  private reachBase(world: World<TowerDefenseComponentRegistry>, entity: number): void {
    world.eventBus?.emit("creep:reached_base", { entity });
    world.mutateSingleton("GameState", (gs: GameStateComponent) => {
      gs.lives = Math.max(0, gs.lives - 1);
    });
    world.destroyEntity(entity);
  }
}
