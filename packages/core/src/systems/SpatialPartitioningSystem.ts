import { System } from "../ecs/System";
import { World } from "../ecs/World";
import { CoreComponentRegistry } from "../ecs/CoreComponents";

/**
 * System that organizes entities into spatial structures to optimize queries.
 *
 * @remarks
 * **Reconstructible Cache Contract ("Reconstructible in 1 tick")**:
 * Spatial grid cell indices (`SpatialNode` component state and internal cell calculations) represent derived
 * ephemeral spatial partitioning indices. These transient caches are not serialized in snapshots.
 * Upon `world.restore(snapshot)`, spatial partitioning indices automatically re-synchronize on the subsequent
 * system update tick based strictly on canonical `Transform` coordinates, guaranteeing 100% state hash parity
 * and deterministic replay behavior.
 *
 * @public
 */
export class SpatialPartitioningSystem extends System<CoreComponentRegistry> {
  private readonly cellSize = 100;

  /**
   * Calculates spatial grid cell coordinates for entities with transform and spatial node components.
   *
   * @param world - The ECS world containing active entities.
   * @param _deltaTime - Elapsed frame duration in seconds (unused).
   */
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
