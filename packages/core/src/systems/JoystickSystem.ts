import { System } from "../ecs/System";
import { World } from "../ecs/World";
import { CoreComponentRegistry } from "../ecs/CoreComponents";

/** @public
 * @deprecated Use React Bridge input routing via BaseGame.setInputState() instead.
 */
export class JoystickSystem extends System<CoreComponentRegistry> {
  public update(_world: World<CoreComponentRegistry>, _deltaTime: number): void {
      // Joystick logic
  }
}
