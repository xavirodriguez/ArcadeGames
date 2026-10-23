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
 * Removes non-player entities marked Dead.
 */
class HitRunDeadCleanupSystem extends System<CoreComponentRegistry> {
  public update(world: World<CoreComponentRegistry>, _dt: number): void {
    const dead = world.query("Dead");
    for (let i = 0; i < dead.length; i++) {
      const e = dead[i];
      if (world.hasComponent(e, "PlatformerInput")) continue;
      if (world.hasComponent(e, "BeltInput")) continue;
      world.commands.removeEntity(e);
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
