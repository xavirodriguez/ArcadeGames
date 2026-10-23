/**
 * Wire HitRunCombatSystem + remove dead enemies so weapons/melee actually kill.
 */
import {
  System,
  SystemPhase,
  World,
  CoreComponentRegistry,
  CollisionSystem2D,
  HierarchySystem,
  CCDSystem
} from "@tiny-aster/core";
import { HitRunCombatSystem } from "./HitRunCombatSystem";
import { HitRunOrphanEnemyCleanupSystem } from "./HitRunOrphanEnemyCleanupSystem";

/**
 * Processes explicit EnemyDeathState phase on dead non-player entities before removing or reclaiming.
 */
class HitRunDeadCleanupSystem extends System<CoreComponentRegistry> {
  public update(world: World<CoreComponentRegistry>, _dt: number): void {
    const dead = world.query("Dead");
    for (let i = 0; i < dead.length; i++) {
      const e = dead[i];
      if (world.hasComponent(e, "PlatformerInput")) continue;
      if (world.hasComponent(e, "BeltInput")) continue;
      if (world.hasComponent(e, "HitRunPow")) continue;

      if (!world.hasComponent(e, "EnemyDeathState")) {
        world.getCommandBuffer().addComponent(e, {
          type: "EnemyDeathState",
          timer: 0.35,
          phase: "dying"
        } as never);
        if (world.hasComponent(e, "Collider2D")) {
          world.mutateComponent(e, "Collider2D", (c) => {
            c.enabled = false;
          });
        }
        if (world.hasComponent(e, "Hurtbox")) {
          world.getCommandBuffer().removeComponent(e, "Hurtbox");
        }
      } else {
        const deathState = world.getMutableComponent(e, "EnemyDeathState") as
          | { timer: number; phase: string }
          | undefined;
        if (deathState) {
          deathState.timer -= _dt;
          if (deathState.timer <= 0) {
            const reclaimable = world.getComponent(e, "Reclaimable");
            if (reclaimable) {
              const pool = world.getResource<{ releaseEnemy: (w: World<CoreComponentRegistry>, entity: number) => void }>(
                reclaimable.poolId
              );
              if (pool) {
                pool.releaseEnemy(world, e);
                continue;
              }
            }
            world.commands.removeEntity(e);
          }
        }
      }
    }
  }
}

/**
 * Register after Collision phase systems so CollisionEvents are populated.
 */
export function registerHitRunCombat(world: World<CoreComponentRegistry>): void {
  world.addSystem(new HierarchySystem(), {
    phase: SystemPhase.Collision,
    priority: 100
  });
  world.addSystem(new CCDSystem(), {
    phase: SystemPhase.Collision,
    priority: 20
  });
  world.addSystem(new CollisionSystem2D(), {
    phase: SystemPhase.Collision,
    priority: 10
  });
  world.addSystem(new HitRunCombatSystem(), {
    phase: SystemPhase.Collision,
    priority: -5
  });
  world.addSystem(new HitRunOrphanEnemyCleanupSystem(), {
    phase: SystemPhase.GameRules,
    priority: 40
  });
  world.addSystem(new HitRunDeadCleanupSystem(), {
    phase: SystemPhase.GameRules,
    priority: 50
  });
}
