import { System } from "../ecs/System";
import { World } from "../ecs/World";
import { CoreComponentRegistry } from "../ecs/CoreComponents";
import { IHapticDevice, NullHapticDevice } from "../audio/IHapticDevice";

/** @public */
export class FeedbackSystem extends System<CoreComponentRegistry> {
  private hapticDevice: IHapticDevice;

  constructor(hapticDevice?: IHapticDevice) {
    super();
    this.hapticDevice = hapticDevice || new NullHapticDevice();
  }

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
