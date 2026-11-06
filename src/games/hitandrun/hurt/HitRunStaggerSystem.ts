import { System, World, CoreComponentRegistry } from "@tiny-aster/core";

/**
 * Runs after the enemy FSM so active hitstun/stagger cannot be overwritten by
 * patrol/attack steering in the same simulation step.
 */
export class HitRunStaggerSystem extends System<CoreComponentRegistry> {
  public update(world: World<CoreComponentRegistry>, _deltaTime: number): void {
    if (world.getResource("IsPaused") === true) return;
    const entities = world.query("Enemy", "HitReaction", "Velocity");
    for (let i = 0; i < entities.length; i++) {
      const reaction = world.getComponent(entities[i], "HitReaction") as
        | { hitstunRemaining?: number; staggerRemaining?: number }
        | undefined;
      if (!reaction) continue;
      if ((reaction.hitstunRemaining ?? 0) <= 0 && (reaction.staggerRemaining ?? 0) <= 0) {
        continue;
      }
      const velocity = world.getMutableComponent(entities[i], "Velocity") as
        | { vx: number }
        | undefined;
      if (velocity && velocity.vx !== 0) velocity.vx = 0;
    }
  }
}
