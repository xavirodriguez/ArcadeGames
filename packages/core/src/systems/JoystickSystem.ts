import { System } from "../ecs/System";
import { World } from "../ecs/World";
import { CoreComponentRegistry } from "../ecs/CoreComponents";

/**
 * @public
 * @deprecated This system is obsolete. VirtualJoystick now bypasses the ECS components and writes directly to the player's Input component via the React Bridge.
 */
export class JoystickSystem extends System<CoreComponentRegistry> {
  public update(_world: World<CoreComponentRegistry>, _deltaTime: number): void {
      // Joystick logic
  }
}
