import { ShapeDrawer, EffectDrawer } from "@tiny-aster/core";
import { GeometryWarsComponentRegistry } from "../types/GeometryWarsRegistry";
import { colors } from "../../../theme/colors";
import { getDisplacedPoint, BULLET_COORDS } from "../../shared/rendering/ProceduralShapeUtils";
import { getDrawable, getDrawableTransform } from "../../shared/rendering/renderingUtils";
import { resolveInvulnerabilityPulse } from "../../shared/rendering/RenderUtils";
import { CanvasMotionTrail } from "../../shared/rendering/CanvasNeonUtils";
import {
  getActiveParticles,
  updatePlayerShipVisuals,
  prepareGeometryWarsFramePrologue,
  GEOMETRY_WARS_PARTICLE_POOL,
  spawnVisualParticle,
  resetVisualState
} from "./GeometryWarsVisualLogic";

const gwShipCanvasTrail = new CanvasMotionTrail(20);
const gwBulletCanvasTrail = new CanvasMotionTrail(20);

// For backwards compatibility if imported elsewhere
export { GEOMETRY_WARS_PARTICLE_POOL, spawnVisualParticle, resetVisualState };

function drawCanvasVisualParticles(ctx: CanvasRenderingContext2D): void {
  const particles = getActiveParticles();
  ctx.save();
  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    if (!p.active) continue;

    const ratio = p.life / p.maxLife;
    ctx.globalAlpha = ratio;
    ctx.fillStyle = p.color;
    ctx.shadowBlur = 6;
    ctx.shadowColor = p.color;
    ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
  }
  ctx.restore();
}

// ============================================================================
// HIGH-FIDELITY SHAPE DRAWERS
// ============================================================================

function applyNeonStroke(
  ctx: CanvasRenderingContext2D,
  color: string,
  lineWidth = 1.5,
  shadowBlur = 8
): void {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.shadowBlur = shadowBlur;
  ctx.shadowColor = color;
}

/**
 * Shape drawer for the Geometry Wars player ship (neon diamond/arrow).
 * @public
 */
export const drawPlayerShip: ShapeDrawer<CanvasRenderingContext2D, GeometryWarsComponentRegistry> = {
  draw(ctx, world, entity) {
    const drawable = getDrawable(world, entity, 16);
    if (!drawable) return;
    const { render, size } = drawable;

    const transform = getDrawableTransform(world, entity);
    if (!transform) return;

    const player = world.getComponent(entity, "Player");
    if (!player) return;
    const color = render.color ?? colors.cyan;
    const x = transform.worldX ?? transform.x;
    const y = transform.worldY ?? transform.y;

    // Trigger thruster smoke/engine particles and muzzle flash sparks
    updatePlayerShipVisuals(world, entity, render, x, y, color);

    gwShipCanvasTrail.update(entity, x, y, 4);
    gwShipCanvasTrail.draw(ctx, entity, x, y, 12, size, color, colors.white);

    ctx.save();

    // Invulnerability flashing blinking feedback
    const invState = resolveInvulnerabilityPulse(player.invulnRemaining, 1.0, { mode: "tick", tick: world.tick, pulseDivisor: 4, dimOpacity: 0.3 });
    if (invState.isInvulnerable) {
      ctx.globalAlpha = invState.opacity;
    }

    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.shadowBlur = 12;
    ctx.shadowColor = color;

    // Draw arrow/diamond shape
    ctx.beginPath();
    ctx.moveTo(size, 0); // Nose pointing right (0 degrees is along +X)
    ctx.lineTo(-size / 2, -size / 2);
    ctx.lineTo(-size / 4, 0);
    ctx.lineTo(-size / 2, size / 2);
    ctx.closePath();
    ctx.stroke();

    // Hot inner core
    ctx.shadowBlur = 0;
    ctx.fillStyle = colors.white;
    ctx.beginPath();
    ctx.moveTo(size * 0.4, 0);
    ctx.lineTo(-size * 0.2, -size * 0.2);
    ctx.lineTo(-size * 0.1, 0);
    ctx.lineTo(-size * 0.2, size * 0.2);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }
};

/**
 * Shape drawer for Particle (glow square).
 * @public
 */
export const drawParticle: ShapeDrawer<CanvasRenderingContext2D, GeometryWarsComponentRegistry> = {
  draw(ctx, world, entity) {
    const drawable = getDrawable(world, entity, 3);
    if (!drawable) return;
    const { render, size } = drawable;
    const color = render.color ?? colors.white;

    ctx.save();
    ctx.fillStyle = color;
    ctx.shadowBlur = 6;
    ctx.shadowColor = color;
    ctx.fillRect(-size / 2, -size / 2, size, size);
    ctx.restore();
  }
};

function drawDiamondEnemy(
  ctx: CanvasRenderingContext2D,
  world: any,
  entity: number,
  defaultSize: number,
  aspectX: number = 1.0,
  strokeWidth: number = 1.5,
  shadowBlur: number = 8
): void {
  const drawable = getDrawable(world, entity, defaultSize);
  if (!drawable) return;
  const { render, size } = drawable;
  const color = render.color ?? colors.pink;

  applyNeonStroke(ctx, color, strokeWidth, shadowBlur);

  ctx.beginPath();
  ctx.moveTo(0, -size);
  ctx.lineTo(size * aspectX, 0);
  ctx.lineTo(0, size);
  ctx.lineTo(-size * aspectX, 0);
  ctx.closePath();
  ctx.stroke();

  ctx.restore();
}

/**
 * Shape drawer for Chaser enemy (magenta diamond).
 * @public
 */
export const drawChaser: ShapeDrawer<CanvasRenderingContext2D, GeometryWarsComponentRegistry> = {
  draw(ctx, world, entity) {
    drawDiamondEnemy(ctx, world, entity, 14, 1.0, 2, 10);
  }
};

/**
 * Shape drawer for Evader enemy (orange triangle / star).
 * @public
 */
export const drawEvader: ShapeDrawer<CanvasRenderingContext2D, GeometryWarsComponentRegistry> = {
  draw(ctx, world, entity) {
    const drawable = getDrawable(world, entity, 14);
    if (!drawable) return;
    const { render, size } = drawable;
    const color = render.color ?? "#ffaa00";

    applyNeonStroke(ctx, color, 2, 10);

    ctx.beginPath();
    ctx.moveTo(size, 0);
    ctx.lineTo(-size / 2, -size / 2);
    ctx.lineTo(-size / 2, size / 2);
    ctx.closePath();
    ctx.stroke();

    ctx.restore();
  }
};

/**
 * Shape drawer for Grunt enemy (cyan small triangle).
 * @public
 */
export const drawGrunt: ShapeDrawer<CanvasRenderingContext2D, GeometryWarsComponentRegistry> = {
  draw(ctx, world, entity) {
    const drawable = getDrawable(world, entity, 10);
    if (!drawable) return;
    const { render, size } = drawable;
    const color = render.color ?? colors.cyan;

    applyNeonStroke(ctx, color);

    ctx.beginPath();
    ctx.moveTo(size, 0);
    ctx.lineTo(-size, -size * 0.7);
    ctx.lineTo(-size, size * 0.7);
    ctx.closePath();
    ctx.stroke();

    ctx.restore();
  }
};

/**
 * Shape drawer for bullets.
 * @public
 */
export const drawBullet: ShapeDrawer<CanvasRenderingContext2D, GeometryWarsComponentRegistry> = {
  draw(ctx, world, entity) {
    const drawable = getDrawable(world, entity, 4);
    if (!drawable) return;
    const { render, size } = drawable;
    const color = render.color ?? colors.gold;

    const transform = getDrawableTransform(world, entity);
    if (transform) {
      const bx = transform.worldX ?? transform.x;
      const by = transform.worldY ?? transform.y;
      gwBulletCanvasTrail.update(entity, bx, by, 2);
      gwBulletCanvasTrail.draw(ctx, entity, bx, by, 8, size, color, colors.white);
    }

    applyNeonStroke(ctx, color);

    // Draw a small bright laser line
    ctx.beginPath();
    ctx.moveTo(-size, 0);
    ctx.lineTo(size, 0);
    ctx.stroke();

    ctx.restore();
  }
};

/**
 * Shape drawer for enemy seeker (neon diamond/star).
 * @public
 */
export const drawEnemySeeker: ShapeDrawer<CanvasRenderingContext2D, GeometryWarsComponentRegistry> = {
  draw(ctx, world, entity) {
    drawDiamondEnemy(ctx, world, entity, 12, 0.5, 1.5, 8);
  }
};

/**
 * Shape drawer for enemy evader (neon square).
 * @public
 */
export const drawEnemyEvader: ShapeDrawer<CanvasRenderingContext2D, GeometryWarsComponentRegistry> = {
  draw(ctx, world, entity) {
    const drawable = getDrawable(world, entity, 12);
    if (!drawable) return;
    const { render, size } = drawable;
    const color = render.color ?? colors.green;

    applyNeonStroke(ctx, color);

    ctx.beginPath();
    ctx.rect(-size / 2, -size / 2, size, size);
    ctx.stroke();

    ctx.restore();
  }
};

/**
 * Shape drawer for enemy fast seeker (neon arrow/triangle).
 * @public
 */
export const drawEnemyFastSeeker: ShapeDrawer<CanvasRenderingContext2D, GeometryWarsComponentRegistry> = {
  draw(ctx, world, entity) {
    const drawable = getDrawable(world, entity, 8);
    if (!drawable) return;
    const { render, size } = drawable;
    const color = render.color ?? colors.pink;

    applyNeonStroke(ctx, color);

    ctx.beginPath();
    ctx.moveTo(size, 0);
    ctx.lineTo(-size, -size / 2);
    ctx.lineTo(-size / 2, 0);
    ctx.lineTo(-size, size / 2);
    ctx.closePath();
    ctx.stroke();

    ctx.restore();
  }
};

// ============================================================================
// GEOMETRY WARS BACKGROUND NEON DEFORMING GRID EFFECT
// ============================================================================

function drawDeformingGridLines(
  ctx: CanvasRenderingContext2D,
  outerMax: number,
  innerMax: number,
  playerX: number,
  playerY: number,
  bulletCount: number,
  getPointCoords: (outer: number, inner: number) => { x: number; y: number }
): void {
  for (let outer = 0; outer <= outerMax; outer += 40) {
    ctx.beginPath();
    let first = true;
    for (let inner = 0; inner <= innerMax; inner += 25) {
      const pt = getPointCoords(outer, inner);
      const displaced = getDisplacedPoint(pt.x, pt.y, playerX, playerY, BULLET_COORDS, bulletCount);
      if (first) {
        ctx.moveTo(displaced.x, displaced.y);
        first = false;
      } else {
        ctx.lineTo(displaced.x, displaced.y);
      }
    }
    ctx.stroke();
  }
}

/**
 * High-fidelity, deforming glowing neon blue background grid.
 * @public
 */
export const drawGeometryWarsBackground: EffectDrawer<CanvasRenderingContext2D, GeometryWarsComponentRegistry> = {
  draw(ctx, world) {
    const screen = world.getResource<{ width: number; height: number }>("ScreenConfig") || { width: 800, height: 600 };
    const { width, height } = screen;

    // 1. Frame prologue: update particles, monitor bullet trails, resolve grid displacement context
    const { playerX, playerY, bulletCount } = prepareGeometryWarsFramePrologue(world, width, height, colors.gold, colors.pink);

    // 2. Render visual particles
    drawCanvasVisualParticles(ctx);

    // 3. Draw Deforming Grid Lines
    ctx.save();
    ctx.strokeStyle = "rgba(0, 160, 255, 0.16)"; // Translucent neon blue
    ctx.lineWidth = 0.8;

    // Draw horizontal grid lines
    drawDeformingGridLines(ctx, height, width, playerX, playerY, bulletCount, (y, x) => ({ x, y }));

    // Draw vertical grid lines
    drawDeformingGridLines(ctx, width, height, playerX, playerY, bulletCount, (x, y) => ({ x, y }));

    ctx.restore();
  }
};
