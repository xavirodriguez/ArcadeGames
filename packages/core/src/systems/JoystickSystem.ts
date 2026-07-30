import { System } from "../ecs/System";
import { World } from "../ecs/World";
import { CoreComponentRegistry } from "../ecs/CoreComponents";

/**
 * @deprecated Obsolete joystick entity handler. VirtualJoystick is now a pure React visual component.
 * @public
 */
export class JoystickSystem extends System<CoreComponentRegistry> {
  public update(_world: World<CoreComponentRegistry>, _deltaTime: number): void {
      // Joystick logic
  }
}
