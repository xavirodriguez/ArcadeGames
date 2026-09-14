import { System } from "../../ecs/System";
import { World } from "../../ecs/World";
import { CoreComponentRegistry } from "../../ecs/CoreComponents";

/**
 * Diagnostic debug system for visual overlay rendering and performance telemetry.
 * @public
 */
export class DebugSystem extends System<CoreComponentRegistry> {
  /**
   * Performs per-tick debug data collection.
   *
   * @param _world - Target ECS world instance.
   * @param _deltaTime - Elapsed delta time in seconds.
   */
  public update(_world: World<CoreComponentRegistry>, _deltaTime: number): void {}

  /**
   * Renders debug visual overlays (e.g. bounding boxes, entity IDs) on a 2D rendering context.
   *
   * @param _ctx - Target canvas/graphics context.
   * @param _world - Target ECS world instance.
   */
  public renderDebug(_ctx: unknown, _world: World<CoreComponentRegistry>): void {}
}
