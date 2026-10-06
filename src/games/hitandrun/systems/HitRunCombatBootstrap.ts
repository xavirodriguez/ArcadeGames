/**
 * Wire CombatSystem + remove dead enemies so HMG actually kills.
 * Platformer common systems never register CombatSystem (only HitDetection for pulse).
 */
import {
  System,
  SystemPhase,
  World,
  CoreComponentRegistry,
  CollisionSystem2D,
  HierarchySystem
} from "@tiny-aster/core";
import { CombatSystem } from "@tiny-aster/gameplay-kit";

/**
 * Removes non-player entities marked Dead (CombatSystem only adds the tag).
 */
class HitRunDeadCleanupSystem extends System<CoreComponentRegistry> {
  public update(world: World<CoreComponentRegistry>, _dt: number): void {
    const dead = world.query("Dead");
    for (let i = 0; i < dead.length; i++) {
      const e = dead[i];
      if (world.hasComponent(e, "PlatformerInput")) continue; // player: RespawnSystem
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
  world.addSystem(new CollisionSystem2D(), {
    phase: SystemPhase.Collision,
    priority: 10
  });
  world.addSystem(new CombatSystem(), {
    phase: SystemPhase.Collision,
    priority: -5 // after CollisionSystem2D / HitDetection
  });
  world.addSystem(new HitRunDeadCleanupSystem(), {
    phase: SystemPhase.GameRules,
    priority: 50
  });
}
