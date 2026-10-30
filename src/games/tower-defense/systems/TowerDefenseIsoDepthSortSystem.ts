import { System, World } from "@tiny-aster/core";
import type { TowerDefenseComponentRegistry, TowerDefenseEventRegistry } from "../types/TowerDefenseTypes";
import type { TowerDefenseConfig } from "../types/TowerDefenseConfigSchema";
import { depthOf } from "../rendering/IsoProjection";

/**
 * Assigns deterministic spatial painter-order keys to Tower Defense entities.
 *
 * Gameplay keeps Cartesian world coordinates. Only Render.order changes, and
 * only when the isometric presentation mode is active.
 */
export class TowerDefenseIsoDepthSortSystem extends System<TowerDefenseComponentRegistry, TowerDefenseEventRegistry> {
  public override update(world: World<TowerDefenseComponentRegistry, TowerDefenseEventRegistry>): void {
    const config = world.getResource<TowerDefenseConfig>("GameConfig");
    if (config?.projection !== "isometric") return;

    const entities = world.query("Transform", "Render");
    for (const entity of entities) {
      const isTower = world.getComponent(entity, "Tower") !== undefined;
      const isCreep = world.getComponent(entity, "Creep") !== undefined;
      const isProjectile = world.getComponent(entity, "TowerProjectile") !== undefined;
      if (!isTower && !isCreep && !isProjectile) continue;

      const transform = world.getComponent(entity, "Transform");
      const render = world.getMutableComponent(entity, "Render");
      if (!transform || !render) continue;

      const worldX = transform.worldX ?? transform.x;
      const worldY = transform.worldY ?? transform.y;
      render.order = depthOf(worldX, worldY);
      render.depthSort = false;
    }
  }
}
