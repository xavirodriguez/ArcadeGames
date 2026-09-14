import { System } from "../ecs/System";
import { World } from "../ecs/World";
import { CoreComponentRegistry } from "../ecs/CoreComponents";

/**
 * System processing user input events for interactive UI elements.
 * @public
 */
export class UIInputSystem extends System<CoreComponentRegistry> {
  /**
   * Processes active UI input states during simulation ticks.
   *
   * @param _world - Target ECS world instance.
   * @param _deltaTime - Elapsed delta time in seconds.
   */
  public update(_world: World<CoreComponentRegistry>, _deltaTime: number): void {}
}
