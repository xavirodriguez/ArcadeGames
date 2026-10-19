import { ShapeDrawer, EffectDrawer } from "@tiny-aster/core";
import { GeometryWarsComponentRegistry } from "../types/GeometryWarsRegistry";
import { colors } from "../../../theme/colors";
import { getDisplacedPoint, BULLET_COORDS } from "../../shared/rendering/ProceduralShapeUtils";
import { getDrawable, getDrawableTransform } from "../../shared/rendering/renderingUtils";
import { resolveInvulnerabilityPulse } from "../../shared/rendering/RenderUtils";
import { CanvasGlowCache } from "../../shared/rendering/GlowSystem";
import {
  getActiveParticles,
  updatePlayerShipVisuals,
  prepareGeometryWarsFramePrologue,
  GEOMETRY_WARS_PARTICLE_POOL,
  spawnVisualParticle,
  resetVisualState
} from "./GeometryWarsVisualLogic";

// For backwards compatibility if imported elsewhere
export { GEOMETRY_WARS_PARTICLE_POOL, spawnVisualParticle, resetVisualState };

function drawCanvasVisualParticles(ctx: CanvasRenderingContext2D): void {
  const particles = getActiveParticles();
  const glowCache = CanvasGlowCache.getInstance();
  ctx.save();
  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    if (!p.active) continue;

    const key = `gw_particle_${p.color}_${p.size}`;
    const padding = 12;
    const totalW = p.size + padding;
    const totalH = p.size + padding;

    const offscreen = glowCache.getOrCreate(key, totalW, totalH, (offCtx) => {
      offCtx.save();
      offCtx.translate(totalW / 2, totalH / 2);
      offCtx.fillStyle = p.color;
      offCtx.shadowBlur = 6;
      offCtx.shadowColor = p.color;
      offCtx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      offCtx.restore();
    });

    const ratio = p.life / p.maxLife;
    ctx.globalAlpha = ratio;
    ctx.drawImage(offscreen as CanvasImageSource, p.x - totalW / 2, p.y - totalH / 2);
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
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.shadowBlur = shadowBlur;
  ctx.shadowColor = color;
}

function drawCachedNeonShape(
  ctx: CanvasRenderingContext2D,
  key: string,
  boundSize: number,
  drawPathFn: (offCtx: CanvasRenderingContext2D) => void
): void {
  const padding = 24;
  const totalW = boundSize * 2 + padding * 2;
  const totalH = boundSize * 2 + padding * 2;

  const offscreen = CanvasGlowCache.getInstance().getOrCreate(key, totalW, totalH, (offCtx) => {
    offCtx.save();
    offCtx.translate(totalW / 2, totalH / 2);
    drawPathFn(offCtx);
    offCtx.restore();
  });

  ctx.drawImage(offscreen as CanvasImageSource, -totalW / 2, -totalH / 2);
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

    const key = `gw_part_${color}_${size}`;
    const padding = 12;
    const totalW = size + padding;
    const totalH = size + padding;

    const offscreen = CanvasGlowCache.getInstance().getOrCreate(key, totalW, totalH, (offCtx) => {
      offCtx.save();
      offCtx.translate(totalW / 2, totalH / 2);
      offCtx.fillStyle = color;
      offCtx.shadowBlur = 6;
      offCtx.shadowColor = color;
      offCtx.fillRect(-size / 2, -size / 2, size, size);
      offCtx.restore();
    });

    ctx.drawImage(offscreen as CanvasImageSource, -totalW / 2, -totalH / 2);
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
  const key = `gw_diamond_${color}_${size}_${aspectX}_${strokeWidth}_${shadowBlur}`;

  drawCachedNeonShape(ctx, key, size, (offCtx) => {
    applyNeonStroke(offCtx, color, strokeWidth, shadowBlur);
    offCtx.beginPath();
    offCtx.moveTo(0, -size);
    offCtx.lineTo(size * aspectX, 0);
    offCtx.lineTo(0, size);
    offCtx.lineTo(-size * aspectX, 0);
    offCtx.closePath();
    offCtx.stroke();
  });
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
    const color = render.color ?? colors.warning;
    const key = `gw_evader_${color}_${size}`;

    drawCachedNeonShape(ctx, key, size, (offCtx) => {
      applyNeonStroke(offCtx, color, 2, 10);
      offCtx.beginPath();
      offCtx.moveTo(size, 0);
      offCtx.lineTo(-size / 2, -size / 2);
      offCtx.lineTo(-size / 2, size / 2);
      offCtx.closePath();
      offCtx.stroke();
    });
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
    const key = `gw_grunt_${color}_${size}`;

    drawCachedNeonShape(ctx, key, size, (offCtx) => {
      applyNeonStroke(offCtx, color, 1.5, 8);
      offCtx.beginPath();
      offCtx.moveTo(size, 0);
      offCtx.lineTo(-size, -size * 0.7);
      offCtx.lineTo(-size, size * 0.7);
      offCtx.closePath();
      offCtx.stroke();
    });
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
    const key = `gw_bullet_${color}_${size}`;

    drawCachedNeonShape(ctx, key, size, (offCtx) => {
      applyNeonStroke(offCtx, color, 1.5, 8);
      offCtx.beginPath();
      offCtx.moveTo(-size, 0);
      offCtx.lineTo(size, 0);
      offCtx.stroke();
    });
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
    const key = `gw_enemy_evader_${color}_${size}`;

    drawCachedNeonShape(ctx, key, size, (offCtx) => {
      applyNeonStroke(offCtx, color, 1.5, 8);
      offCtx.beginPath();
      offCtx.rect(-size / 2, -size / 2, size, size);
      offCtx.stroke();
    });
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
    const key = `gw_fast_seeker_${color}_${size}`;

    drawCachedNeonShape(ctx, key, size, (offCtx) => {
      applyNeonStroke(offCtx, color, 1.5, 8);
      offCtx.beginPath();
      offCtx.moveTo(size, 0);
      offCtx.lineTo(-size, -size / 2);
      offCtx.lineTo(-size / 2, 0);
      offCtx.lineTo(-size, size / 2);
      offCtx.closePath();
      offCtx.stroke();
    });
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
    ctx.strokeStyle = colors.border; // Translucent neon grid border
    ctx.lineWidth = 0.8;

    // Draw horizontal grid lines
    drawDeformingGridLines(ctx, height, width, playerX, playerY, bulletCount, (y, x) => ({ x, y }));

    // Draw vertical grid lines
    drawDeformingGridLines(ctx, width, height, playerX, playerY, bulletCount, (x, y) => ({ x, y }));

    ctx.restore();
  }
};
