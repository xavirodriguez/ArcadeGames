import { System } from "../ecs/System";
import { World } from "../ecs/World";
import { CoreComponentRegistry } from "../ecs/CoreComponents";

/** @public */
export class UIInputSystem extends System<CoreComponentRegistry> {
  public update(_world: World<CoreComponentRegistry>, _deltaTime: number): void {}
}
