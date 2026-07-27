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
    for (const entity of entities) {
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
