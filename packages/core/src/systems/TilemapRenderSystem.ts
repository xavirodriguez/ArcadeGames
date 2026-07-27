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
        
        world.mutateComponent(entity, "Tilemap", t => {
            t.visibleRange = {
                minX: Math.floor(viewport.minX / tilemap.tileSize),
                minY: Math.floor(viewport.minY / tilemap.tileSize),
                maxX: Math.ceil(viewport.maxX / tilemap.tileSize),
                maxY: Math.ceil(viewport.maxY / tilemap.tileSize)
            };
        });
    }
  }
}
