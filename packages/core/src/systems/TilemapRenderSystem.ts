import { System } from "../ecs/System";
import { World } from "../ecs/World";
import { CoreComponentRegistry } from "../ecs/CoreComponents";
import { SpatialCullingSystem } from "./SpatialCullingSystem";

/** @public */
export class TilemapRenderSystem extends System<CoreComponentRegistry> {
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
