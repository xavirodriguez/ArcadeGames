import { World } from "@tiny-aster/core";
import { GeometryWarsComponentRegistry } from "../types/GeometryWarsRegistry";
import { BULLET_COORDS } from "../../shared/rendering/ProceduralShapeUtils";
import { getRenderGuard, getDrawableTransform } from "../../shared/rendering/renderingUtils";

const SCRATCH_GRID_CONTEXT = { playerX: 0, playerY: 0, bulletCount: 0 };
const LAST_BULLETS_MAP = new Map<number, { x: number; y: number }>();
const CURRENT_BULLETS_SET = new Set<number>();

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

/**
 * Pure monitoring helper for active bullets, generating trails and death explosions.
 * @public
 */
export function monitorBulletsAndSpawnTrails(
  world: World<GeometryWarsComponentRegistry>,
  spawnParticle: (x: number, y: number, vx: number, vy: number, maxLife: number, size: number, color: string) => void,
  goldColor: string = "#ffff00",
  pinkColor: string = "#ff00ff"
): void {
  CURRENT_BULLETS_SET.clear();

  const entities = world.query("Transform", "Render");
  for (const ent of entities) {
    const render = getRenderGuard(world, ent);
    if (render && render.shape === "gw_bullet") {
      CURRENT_BULLETS_SET.add(ent);
      const transform = getDrawableTransform(world, ent)!;
      const bx = transform.worldX ?? transform.x;
      const by = transform.worldY ?? transform.y;

      LAST_BULLETS_MAP.set(ent, { x: bx, y: by });

      if (world.tick % 2 === 0) {
        spawnParticle(
          bx,
          by,
          (world.renderRandom.next() - 0.5) * 15,
          (world.renderRandom.next() - 0.5) * 15,
          0.3,
          2.0,
          goldColor
        );
      }
    }
  }

  for (const [id, pos] of LAST_BULLETS_MAP.entries()) {
    if (!CURRENT_BULLETS_SET.has(id)) {
      const sparkCount = 8 + world.renderRandom.nextInt(0, 4);
      for (let s = 0; s < sparkCount; s++) {
        const angle = world.renderRandom.next() * Math.PI * 2;
        const speed = world.renderRandom.nextRange(40, 100);
        const vx = Math.cos(angle) * speed;
        const vy = Math.sin(angle) * speed;
        spawnParticle(
          pos.x,
          pos.y,
          vx,
          vy,
          world.renderRandom.nextRange(0.4, 0.7),
          world.renderRandom.nextRange(2.0, 3.5),
          world.renderRandom.next() > 0.4 ? goldColor : pinkColor
        );
      }
      LAST_BULLETS_MAP.delete(id);
    }
  }
}
