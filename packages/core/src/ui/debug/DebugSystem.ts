import { System } from "../../ecs/System";
import { World } from "../../ecs/World";
import { CoreComponentRegistry } from "../../ecs/CoreComponents";

/** @public */
export class DebugSystem extends System<CoreComponentRegistry> {
  public update(_world: World<CoreComponentRegistry>, _deltaTime: number): void {}
  public renderDebug(_ctx: unknown, _world: World<CoreComponentRegistry>): void {}
}
