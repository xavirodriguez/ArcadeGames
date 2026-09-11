import { System } from "../ecs/System";
import { World } from "../ecs/World";
import { CoreComponentRegistry } from "../ecs/CoreComponents";
import { IHapticDevice, NullHapticDevice } from "../audio/IHapticDevice";

/**
 * System that processes pending haptic feedback requests and triggers physical device vibrations.
 *
 * @remarks
 * Queries entities with a `HapticRequest` component. If the world is currently re-simulating during netcode rollback
 * (`world.isReSimulating === true`), haptic triggers are skipped to avoid duplicate physical vibrations.
 *
 * Once processed, the `HapticRequest` component is removed from the entity via the world command buffer.
 *
 * @example
 * ```ts
 * const feedbackSystem = new FeedbackSystem(hapticDevice);
 * world.addSystem(feedbackSystem);
 * // Triggers vibration for active HapticRequest entities during normal simulation tick:
 * feedbackSystem.update(world, 0.016);
 * ```
 *
 * @public
 */
export class FeedbackSystem extends System<CoreComponentRegistry> {
  private hapticDevice: IHapticDevice;

  /**
   * Creates an instance of FeedbackSystem with an optional haptic feedback device adapter.
   *
   * @param hapticDevice - Platform haptic device implementing {@link IHapticDevice}. Defaults to {@link NullHapticDevice}.
   */
  constructor(hapticDevice?: IHapticDevice) {
    super();
    this.hapticDevice = hapticDevice || new NullHapticDevice();
  }

  /**
   * Processes active haptic requests across entities and invokes vibration effects on the registered haptic device.
   *
   * @param world - The ECS world containing active entities and components.
   * @param _deltaTime - Elapsed frame time in seconds (unused).
   */
  public update(world: World<CoreComponentRegistry>, _deltaTime: number): void {
    if (world.isReSimulating) return;

    const entities = world.query("HapticRequest");
    const len = entities.length;
    // Safe for determinism/rollback. Early exit when no haptic feedback requests exist, skipping loop setup and lookups.
    if (len === 0) return;

    for (let i = 0; i < len; i++) {
      const entity = entities[i];
      const haptic = world.getComponent(entity, "HapticRequest");
      if (haptic) {
        if (haptic.pattern) {
          this.hapticDevice.vibrate(haptic.pattern);
        }
        world.getCommandBuffer().removeComponent(entity, "HapticRequest");
      }
    }
  }
}
