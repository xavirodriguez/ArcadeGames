import { World } from "@tiny-aster/core";
import { GeometryWarsComponentRegistry } from "../types/GeometryWarsRegistry";
import { BULLET_COORDS } from "../../shared/rendering/ProceduralShapeUtils";
import { getRenderGuard, getDrawableTransform } from "../../shared/rendering/renderingUtils";

export { monitorBulletsAndSpawnTrails } from "./GeometryWarsVisualLogic";

const SCRATCH_GRID_CONTEXT = { playerX: 0, playerY: 0, bulletCount: 0 };

/**
 * Pure state calculation helper to resolve player position and collect bullet coordinates for grid displacement.
 * Uses a zero-allocation file-level scratch object.
 * @public
 */
export function resolveGridDisplacementContext(
  world: World<GeometryWarsComponentRegistry>,
  width: number,
  height: number
): { playerX: number; playerY: number; bulletCount: number } {
  let playerX = width / 2;
  let playerY = height / 2;
  const players = world.query("Player", "Transform");
  if (players.length > 0) {
    const transform = getDrawableTransform(world, players[0]);
    if (transform) {
      playerX = transform.worldX ?? transform.x;
      playerY = transform.worldY ?? transform.y;
    }
  }

  let bulletCount = 0;
  const entities = world.query("Transform", "Render");
  for (const ent of entities) {
    if (bulletCount >= 100) break;
    const render = getRenderGuard(world, ent);
    if (render && render.shape === "gw_bullet") {
      const trans = getDrawableTransform(world, ent);
      if (trans) {
        BULLET_COORDS[bulletCount].x = trans.worldX ?? trans.x;
        BULLET_COORDS[bulletCount].y = trans.worldY ?? trans.y;
        bulletCount++;
      }
    }
  }

  SCRATCH_GRID_CONTEXT.playerX = playerX;
  SCRATCH_GRID_CONTEXT.playerY = playerY;
  SCRATCH_GRID_CONTEXT.bulletCount = bulletCount;
  return SCRATCH_GRID_CONTEXT;
}
