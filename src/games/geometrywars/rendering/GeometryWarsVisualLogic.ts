import { World, RenderComponent } from "@tiny-aster/core";
import { GeometryWarsComponentRegistry } from "../types/GeometryWarsRegistry";
import { colors } from "../../../theme/colors";
import { createParticlePool, VisualParticlePool, VisualParticle } from "../../shared/rendering/VisualParticlePool";
import { resolveGridDisplacementContext } from "./GeometryWarsRenderUtils";
import { getRenderGuard, getDrawableTransform } from "../../shared/rendering/renderingUtils";

// ============================================================================
// SHARED ZERO-ALLOCATION VISUAL PARTICLE POOL & MODULE STATE
// ============================================================================

export const GEOMETRY_WARS_PARTICLE_POOL: VisualParticlePool = createParticlePool(250);

const LAST_BULLETS_MAP = new Map<number, { x: number; y: number }>();
const CURRENT_BULLETS_SET = new Set<number>();

/**
 * Resets the global visual state (particles and bullet tracking maps).
 * Ensures a clean slate when switching games/renderers or restarting.
 * @public
 */
export function resetVisualState(): void {
  GEOMETRY_WARS_PARTICLE_POOL.reset();
  LAST_BULLETS_MAP.clear();
  CURRENT_BULLETS_SET.clear();
}

/**
 * Convenience reset alias matching generic reset contract.
 * @public
 */
export const reset = resetVisualState;

/**
 * Spawns a visual particle into the shared particle pool.
 * @public
 */
export function spawnVisualParticle(
  x: number,
  y: number,
  vx: number,
  vy: number,
  maxLife: number,
  size: number,
  color: string
): void {
  GEOMETRY_WARS_PARTICLE_POOL.spawn(x, y, vx, vy, maxLife, size, color);
}

/**
 * Updates active particles with friction.
 * @public
 */
export function updateVisualParticles(dt: number = 0.016): void {
  GEOMETRY_WARS_PARTICLE_POOL.update(dt, (p) => {
    p.vx *= 0.94; // friction
    p.vy *= 0.94;
  });
}

/**
 * Retrieves active visual particles from the pool.
 * @public
 */
export function getActiveParticles(): VisualParticle[] {
  return GEOMETRY_WARS_PARTICLE_POOL.getActiveParticles();
}

/**
 * Updates thruster smoke and muzzle flash particles for the player ship.
 * Strictly uses world.renderRandom to preserve gameplay state hash determinism.
 * @public
 */
export function updatePlayerShipVisuals(
  world: World<GeometryWarsComponentRegistry>,
  entity: number,
  render: RenderComponent,
  x: number,
  y: number,
  particleColor: string = colors.cyan
): void {
  // Trigger thruster smoke/engine particles trailing behind on movement
  const velocity = world.getComponent(entity, "Velocity");
  if (velocity && (Math.abs(velocity.vx) > 10 || Math.abs(velocity.vy) > 10)) {
    if (world.tick % 3 === 0) {
      const angle = Math.atan2(velocity.vy, velocity.vx) + Math.PI; // opposite direction
      const spreadAngle = angle + (world.renderRandom.next() - 0.5) * 0.4;
      const pSpeed = world.renderRandom.nextRange(30, 80);
      const pvx = Math.cos(spreadAngle) * pSpeed;
      const pvy = Math.sin(spreadAngle) * pSpeed;
      spawnVisualParticle(
        x - Math.cos(angle) * 8,
        y - Math.sin(angle) * 8,
        pvx,
        pvy,
        world.renderRandom.nextRange(0.3, 0.6),
        world.renderRandom.nextRange(2.5, 4.0),
        particleColor
      );
    }
  }

  // Trigger Muzzle Flash Sparks based on hitFlashFrames set on firing
  if (render.hitFlashFrames && render.hitFlashFrames > 0) {
    const aim = world.getComponent(entity, "Aim");
    if (aim) {
      const ax = aim.aimX;
      const ay = aim.aimY;
      const alen = Math.sqrt(ax * ax + ay * ay);
      if (alen > 0.1) {
        const nax = ax / alen;
        const nay = ay / alen;
        const noseX = x + nax * 12;
        const noseY = y + nay * 12;

        // Spawn muzzle flash sparks
        for (let i = 0; i < 4; i++) {
          const spreadAngle = Math.atan2(nay, nax) + (world.renderRandom.next() - 0.5) * 0.6;
          const pSpeed = world.renderRandom.nextRange(80, 160);
          spawnVisualParticle(
            noseX,
            noseY,
            Math.cos(spreadAngle) * pSpeed,
            Math.sin(spreadAngle) * pSpeed,
            world.renderRandom.nextRange(0.15, 0.35),
            world.renderRandom.nextRange(2.0, 3.5),
            colors.white
          );
        }
      }
    }
  }
}

/**
 * Pure monitoring helper for active bullets, generating trails and death explosions.
 * Strictly uses world.renderRandom to preserve gameplay state hash determinism.
 * @public
 */
export function monitorBulletsAndSpawnTrails(
  world: World<GeometryWarsComponentRegistry>,
  goldColor: string = colors.gold,
  pinkColor: string = colors.pink
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
        spawnVisualParticle(
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
        spawnVisualParticle(
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

/**
 * Frame prologue for Geometry Wars background rendering.
 * Runs particle updates, bullet trail monitoring, and grid displacement context resolution.
 * @public
 */
export function prepareGeometryWarsFramePrologue(
  world: World<GeometryWarsComponentRegistry>,
  width: number,
  height: number,
  goldColor: string = colors.gold,
  pinkColor: string = colors.pink
): { playerX: number; playerY: number; bulletCount: number } {
  updateVisualParticles();
  monitorBulletsAndSpawnTrails(world, goldColor, pinkColor);
  return resolveGridDisplacementContext(world, width, height);
}
