import { System } from "../ecs/System";
import { World } from "../ecs/World";
import { CoreComponentRegistry } from "../ecs/CoreComponents";

/**
 * System that organizes entities into spatial structures to optimize queries.
 *
 * @remarks
 * This system is designed to help reduce the complexity of collision detection
 * and other proximity-based checks from O(N²) toward O(N log N) or O(N).
 *
 * Note: The effectiveness of spatial partitioning depends on appropriate grid/tree
 * bounds, cell sizes, and regular updates.
 *
 * @warning
 * **Internal State & Snapshots**: This system may maintain internal auxiliary caches
 * that are NOT captured in world snapshots. While these are typically rebuilt during
 * the next update, any behavior relying on historical cache state may be inconsistent
 * after a world restoration or rollback.
 * @public
 */
export class SpatialPartitioningSystem extends System<CoreComponentRegistry> {
  private readonly cellSize = 100;

  public update(world: World<CoreComponentRegistry>, _deltaTime: number): void {
    const entities = world.query("Transform", "SpatialNode");
    const len = entities.length;

    for (let i = 0; i < len; i++) {
      const entity = entities[i];
      const transform = world.getComponent(entity, "Transform")!;
      const worldX = transform.worldX ?? transform.x;
      const worldY = transform.worldY ?? transform.y;

      const gridX = Math.floor(worldX / this.cellSize);
      const gridY = Math.floor(worldY / this.cellSize);

      const nodeCheck = world.getComponent(entity, "SpatialNode");
      if (nodeCheck && nodeCheck.gridX === gridX && nodeCheck.gridY === gridY && nodeCheck.active === true) {
        continue;
      }

      // Safe for determinism/rollback. Fetch mutable SpatialNode only when grid cell coordinates or active state actually change, avoiding stateVersion updates when stationary.
      const node = world.getMutableComponent(entity, "SpatialNode");
      if (node) {
        node.gridX = gridX;
        node.gridY = gridY;
        node.active = true;
      }
    }
  }
}
