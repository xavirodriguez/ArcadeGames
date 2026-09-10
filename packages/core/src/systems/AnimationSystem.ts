import { System } from "../ecs/System";
import { World } from "../ecs/World";
import { CoreComponentRegistry } from "../ecs/CoreComponents";
import { EventRegistry } from "../events/EventBus";

/**
 * System that manages sprite sheet frame animation progression for entities with `AnimatorComponent`.
 *
 * @remarks
 * In each frame tick, `AnimationSystem` advances elapsed frame durations for active animations, calculates
 * frame indexing based on frame rates, handles looping, and emits deferred completion events upon non-looping finish.
 *
 * @example
 * ```ts
 * const animationSystem = new AnimationSystem();
 * world.addSystem(animationSystem);
 * animationSystem.update(world, 0.016);
 * ```
 *
 * @public
 */
export class AnimationSystem extends System<CoreComponentRegistry> {
  /**
   * Updates sprite sheet frame timers and advances frame indices for active animators.
   *
   * @param world - The ECS world containing entities and components.
   * @param deltaTime - Elapsed frame duration in seconds.
   */
  public update(world: World<CoreComponentRegistry>, deltaTime: number): void {
    const entities = world.query("Animator");
    const len = entities.length;

    for (let i = 0; i < len; i++) {
      const entity = entities[i];
      const animCheck = world.getComponent(entity, "Animator");
      if (!animCheck || !animCheck.current || !animCheck.animations[animCheck.current]) continue;

      // Safe for determinism/rollback. Fetch mutable Animator only when a valid animation is currently playing, avoiding stateVersion updates on idle/inactive animators.
      const animator = world.getMutableComponent(entity, "Animator")!;
      if (!animator.current) continue;
      const anim = animator.animations[animator.current];

      animator.elapsed += deltaTime;

      const frameTime = 1 / anim.frameRate;
      if (animator.elapsed >= frameTime) {
        animator.elapsed = 0;
        animator.frame++;

        if (animator.frame >= anim.frames.length) {
          if (anim.loop) {
            animator.frame = 0;
          } else {
            animator.frame = anim.frames.length - 1;
            if (anim.onCompleteEvent) {
              const bus = world.getEventBus();
              if (bus) {
                bus.emitDeferred(anim.onCompleteEvent as string & keyof EventRegistry, { entity } as never);
              }
            }
          }
        }
      }
    }
  }
}
