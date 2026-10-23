import { System, World } from "@tiny-aster/core";
import { ShmupComponentRegistry, ShmupEventRegistry } from "../types/ShmupTypes";

/**
 * Ensures that simultaneous enemy projectile overlaps cause at most one player hit
 * per tick. CombatSystem receives deferred hit events, so event-driven invulnerability
 * cannot prevent a second collision from being resolved in the same collision phase.
 */
export class ShmupSingleHitGuardSystem extends System<ShmupComponentRegistry, ShmupEventRegistry> {
  public update(world: World<ShmupComponentRegistry, ShmupEventRegistry>, _deltaTime: number): void {
    if (world.getResource("IsPaused") === true) return;

    for (const player of world.query("ShmupPlayer", "Health", "CollisionEvents")) {
      const health = world.getComponent(player, "Health");
      if (!health || (health.invulnerableRemaining ?? 0) > 0) continue;

      const events = world.getMutableComponent(player, "CollisionEvents");
      if (!events) continue;

      let damageCollisionAccepted = false;
      const collisions = events.collisions;
      for (let index = 0; index < collisions.length; index += 1) {
        const collision = collisions[index];
        const otherEntity = collision?.otherEntity;
        if (otherEntity === undefined) continue;

        const damage = world.getComponent(otherEntity, "Damage");
        const faction = world.getComponent(otherEntity, "Faction");
        if (!damage || faction?.faction !== "enemy") continue;

        if (!damageCollisionAccepted) {
          damageCollisionAccepted = true;
        } else {
          collisions.splice(index, 1);
          index -= 1;
        }
      }
    }
  }
}
