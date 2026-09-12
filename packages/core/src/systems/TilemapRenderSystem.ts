import { System } from "../ecs/System";
import { World } from "../ecs/World";
import { CoreComponentRegistry } from "../ecs/CoreComponents";
import { SpatialCullingSystem } from "./SpatialCullingSystem";

/**
 * System that calculates camera viewport bounds and updates tilemap visible grid cell ranges for optimized rendering.
 *
 * @remarks
 * In each frame, `TilemapRenderSystem` retrieves the active camera viewport from `SpatialCullingSystem`, computes the
 * bounding tile indices (`minX`, `maxX`, `minY`, `maxY`), and updates the `visibleRange` property on `TilemapComponent`.
 *
 * @example
 * ```ts
 * const tilemapRenderSystem = new TilemapRenderSystem();
 * world.addSystem(tilemapRenderSystem);
 * tilemapRenderSystem.update(world, 0.016);
 * ```
 *
 * @public
 */
export class TilemapRenderSystem extends System<CoreComponentRegistry> {
  /**
   * Computes visible tile grid cell ranges for active tilemaps based on camera viewport bounds.
   *
   * @param world - The ECS world containing active entities and components.
   * @param _deltaTime - Elapsed frame duration in seconds (unused).
   */
  public update(world: World<CoreComponentRegistry>, _deltaTime: number): void {
    const tilemaps = world.query("Tilemap");
    if (tilemaps.length === 0) return;

    const viewport = SpatialCullingSystem.getViewport(world);

    for (const entity of tilemaps) {
        const tilemap = world.getComponent(entity, "Tilemap")!;
        const minX = Math.floor(viewport.minX / tilemap.tileSize);
        const minY = Math.floor(viewport.minY / tilemap.tileSize);
        const maxX = Math.ceil(viewport.maxX / tilemap.tileSize);
        const maxY = Math.ceil(viewport.maxY / tilemap.tileSize);

        // Safe for determinism/rollback. Compare calculated visibleRange against current visibleRange before mutating to avoid unnecessary stateVersion bumps on unchanged camera ticks.
        const currentRange = tilemap.visibleRange;
        if (
            !currentRange ||
            currentRange.minX !== minX ||
            currentRange.minY !== minY ||
            currentRange.maxX !== maxX ||
            currentRange.maxY !== maxY
        ) {
            world.mutateComponent(entity, "Tilemap", t => {
                t.visibleRange = { minX, minY, maxX, maxY };
            });
        }
    }
  }
}
