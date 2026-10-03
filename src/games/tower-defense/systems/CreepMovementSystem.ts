import { System, SystemPhase, World } from "@tiny-aster/core";
import type { TowerDefenseComponentRegistry, WaypointList, GameStateComponent } from "../types/TowerDefenseTypes";

/**
 * Moves each creep toward the next waypoint.
 * Applies slowFactor while slowRemainingMs > 0.
 * Deterministic — no RNG.
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

      if (creep.slowRemainingMs > 0) {
        world.mutateComponent(entity, "Creep", (c) => {
          c.slowRemainingMs = Math.max(0, c.slowRemainingMs - dt);
          if (c.slowRemainingMs <= 0) {
            c.slowFactor = 1;
            c.speed = c.baseSpeed;
          }
        });
      }

      const effectiveSpeed =
        creep.slowRemainingMs > 0
          ? creep.baseSpeed * (creep.slowFactor || 1)
          : creep.baseSpeed;

      if (creep.waypointIndex >= points.length) {
        this.reachBase(world, entity);
        continue;
      }

      const target = points[creep.waypointIndex];
      const dx = target.x - transform.x;
      const dy = target.y - transform.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 2) {
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

      const step = Math.min(effectiveSpeed * (dt / 1000), dist);
      const nx = dx / dist;
      const ny = dy / dist;

      world.mutateComponent(entity, "Transform", (t) => {
        t.x += nx * step;
        t.y += ny * step;
      });

      const segmentProgress = 1 - dist / (dist + step);
      world.mutateComponent(entity, "Creep", (c) => {
        c.pathProgress = (c.waypointIndex + segmentProgress) / points.length;
        c.speed = effectiveSpeed;
      });

      world.mutateComponent(entity, "Velocity", (v) => {
        v.vx = nx * effectiveSpeed;
        v.vy = ny * effectiveSpeed;
      });
    }
  }

  private reachBase(world: World<TowerDefenseComponentRegistry>, entity: number): void {
    world.eventBus?.emit("creep:reached_base", { entity });
    const bus = world.getEventBus?.() ?? (world as any).eventBus;
    if (bus && !(world as any).isReSimulating) {
      bus.emitDeferred?.("PlaySFX", { name: "hit" }) ?? bus.emit?.("PlaySFX", { name: "hit" });
    }
    world.mutateSingleton("GameState", (gs: GameStateComponent) => {
      gs.lives = Math.max(0, gs.lives - 1);
    });
    world.destroyEntity(entity);
  }
}
