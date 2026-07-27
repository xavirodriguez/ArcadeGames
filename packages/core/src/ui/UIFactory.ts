import { World } from "../ecs/World";
import { Entity } from "../ecs/Entity";

/** @public */
export class UIFactory {
  public static createPanel(world: World, _config: unknown): Entity {
    return world.createEntity();
  }
}
