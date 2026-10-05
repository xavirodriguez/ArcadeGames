import { System, SystemPhase, World } from "@tiny-aster/core";
import type {
  TowerDefenseComponentRegistry,
  TowerDefenseEventRegistry,
  WaypointList,
  GameStateComponent,
} from "../types/TowerDefenseTypes";

/**
 * Moves each creep toward the next waypoint.
 * Applies slowFactor while slowRemainingMs > 0.
 * Single owner of Creep position — zeroes Velocity so MovementSystem does not double-step.
 */
export class CreepMovementSystem extends System<TowerDefenseComponentRegistry, TowerDefenseEventRegistry> {
  readonly phase = SystemPhase.Simulation;

  update(world: World<TowerDefenseComponentRegistry, TowerDefenseEventRegistry>, dt: number): void {
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
          c.slowRemainingMs = Math.max(0, c.slowRemainingMs - dt * 1000);
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
        const nextWaypoint = creep.waypointIndex + 1;
        world.mutateComponent(entity, "Creep", (c) => {
          c.waypointIndex = nextWaypoint;
          c.pathProgress = nextWaypoint / points.length;
        });
        if (nextWaypoint >= points.length) {
          this.reachBase(world, entity);
        }
        continue;
      }

      const step = Math.min(effectiveSpeed * dt, dist);
      const nx = dx / dist;
      const ny = dy / dist;

      world.mutateComponent(entity, "Transform", (t) => {
        t.x += nx * step;
        t.y += ny * step;
      });

      const remainingDist = dist - step;
      const segmentProgress = 1 - remainingDist / dist;
      world.mutateComponent(entity, "Creep", (c) => {
        c.pathProgress = (c.waypointIndex + segmentProgress) / points.length;
        c.speed = effectiveSpeed;
      });

      world.mutateComponent(entity, "Velocity", (v) => {
        v.vx = 0;
        v.vy = 0;
      });
    }
  }

  private reachBase(world: World<TowerDefenseComponentRegistry, TowerDefenseEventRegistry>, entity: number): void {
    const bus = world.getEventBus();
    bus?.emit("creep:reached_base", { entity });
    if (bus && !(world as any).isReSimulating) {
      bus.emitDeferred?.("PlaySFX", { name: "hit" }) ?? bus.emit?.("PlaySFX", { name: "hit" });
    }
    world.mutateSingleton("GameState", (gs: GameStateComponent) => {
      gs.lives = Math.max(0, gs.lives - 1);
    });
    world.commands.removeEntity(entity);
  }
}
