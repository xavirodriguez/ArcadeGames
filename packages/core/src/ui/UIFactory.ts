import { World } from "../ecs/World";
import { Entity } from "../ecs/Entity";

/**
 * Factory class for instantiating UI component entities.
 * @public
 */
export class UIFactory {
  /**
   * Instantiates a generic UI panel container entity in the world.
   *
   * @param world - Target ECS world instance.
   * @param _config - Panel configuration parameters.
   * @returns Created UI panel entity ID.
   */
  public static createPanel(world: World, _config: unknown): Entity {
    return world.createEntity();
  }
}
