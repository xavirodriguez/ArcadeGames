import { System, World, CoreComponentRegistry } from "@tiny-aster/core";

/**
 * HitRun enemy FSMs already suspend their state updates while HitReaction is
 * active. This system intentionally does not zero Velocity: Velocity also
 * carries the physical knockback impulse applied by HitRunHurtSystem.
 *
 * Keeping this registration preserves the established scheduler contract while
 * avoiding the previous one-tick knockback cancellation.
 */
export class HitRunStaggerSystem extends System<CoreComponentRegistry> {
  public update(world: World<CoreComponentRegistry>, _deltaTime: number): void {
    if (world.getResource("IsPaused") === true) return;
    // The FSM impact lock is the authority for suppressing enemy steering.
    // Physical velocity must remain untouched until physics integrates it.
  }
}
