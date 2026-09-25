import { ShapeDrawer, EffectDrawer } from "@tiny-aster/core";
import { GeometryWarsComponentRegistry } from "../types/GeometryWarsRegistry";
import { getDisplacedPoint, BULLET_COORDS } from "../../shared/rendering/ProceduralShapeUtils";
import { resolveInvulnerabilityPulse } from "../../shared/rendering/RenderUtils";
import { ensureSkiaAvailable, getRenderGuard, getDrawableTransform, defineSkiaShape } from "../../shared/rendering/renderingUtils";
import {
  getActiveParticles,
  updatePlayerShipVisuals,
  prepareGeometryWarsFramePrologue,
  GEOMETRY_WARS_PARTICLE_POOL,
  spawnVisualParticle,
  resetVisualState
} from "./GeometryWarsVisualLogic";

import { Skia, getPaint } from "../../shared/rendering/SkiaContext";
import { SkiaMotionTrail } from "../../shared/rendering/SkiaNeonUtils";

const gwShipSkiaTrail = new SkiaMotionTrail(20);
const gwBulletSkiaTrail = new SkiaMotionTrail(20);

// For backwards compatibility if imported elsewhere
export {
  GEOMETRY_WARS_PARTICLE_POOL as GEOMETRY_WARS_SKIA_PARTICLE_POOL,
  spawnVisualParticle as spawnSkiaVisualParticle,
  resetVisualState
};

/**
 * Draws all active particles with neon glow.
 */
function drawVisualParticles(canvas: any): void {
  if (!ensureSkiaAvailable()) return;
  const paint = getPaint();

  const particles = getActiveParticles();
  canvas.save();
  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    if (!p.active) continue;

    const ratio = p.life / p.maxLife;
    paint.reset();
    paint.setAntiAlias(true);
    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(p.skColor || Skia.Color(p.color));
    paint.setAlphaf(ratio);

    canvas.drawRect(
      Skia.XYWHRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size),
      paint
    );
  }
  canvas.restore();
}

// ============================================================================
// HIGH-FIDELITY SHAPE DRAWERS
// ============================================================================

function setupSkiaStrokePaint(paint: any, color: string, strokeWidth = 1.5, opacity = 1.0): void {
  paint.reset();
  paint.setAntiAlias(true);
  paint.setStyle(Skia.PaintStyle.Stroke);
  paint.setStrokeWidth(strokeWidth);
  paint.setColor(Skia.Color(color));
  paint.setAlphaf(opacity);
}

/**
 * Skia shape drawer for the player ship.
 * @public
 */
export const drawSkiaPlayerShip: ShapeDrawer<any, GeometryWarsComponentRegistry> = {
  draw(canvas, world, entity) {
    if (!ensureSkiaAvailable()) return;

    const render = getRenderGuard(world, entity);
    if (!render) return;

    const transform = getDrawableTransform(world, entity);
    if (!transform) return;

    const player = world.getComponent(entity, "Player");
    if (!player) return;

    const size = render.size ?? 16;
    const color = render.color ?? "#00f0ff";

    const x = transform.worldX ?? transform.x;
    const y = transform.worldY ?? transform.y;

    // Trigger thruster smoke/engine particles and muzzle flash sparks
    updatePlayerShipVisuals(world, entity, render, x, y, color);

    const paint = getPaint();
    if (paint) {
      gwShipSkiaTrail.update(entity, x, y, 4);
      gwShipSkiaTrail.drawSkia(canvas, paint, entity, x, y, 12, size, color, "#ffffff");
    }

    canvas.save();

    let visualOpacity = render.opacity ?? 1.0;
    // Invulnerability flashing blinking feedback in Skia
    const invState = resolveInvulnerabilityPulse(player.invulnRemaining, visualOpacity, { mode: "tick", tick: world.tick, pulseDivisor: 4, dimOpacity: 0.3 });
    if (invState.isInvulnerable) {
      visualOpacity = invState.opacity;
    }

    // 1. Draw glowing neon stroke outline using a Skia path
    setupSkiaStrokePaint(paint, color, 2.0, visualOpacity);

    const path = Skia.Path.Make();
    path.moveTo(size, 0); // Nose pointing right
    path.lineTo(-size / 2, -size / 2);
    path.lineTo(-size / 4, 0);
    path.lineTo(-size / 2, size / 2);
    path.close();

    canvas.drawPath(path, paint);

    // 2. Draw white inner hot core
    paint.reset();
    paint.setAntiAlias(true);
    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color("#ffffff"));
    paint.setAlphaf(visualOpacity);

    const corePath = Skia.Path.Make();
    corePath.moveTo(size * 0.4, 0);
    corePath.lineTo(-size * 0.2, -size * 0.2);
    corePath.lineTo(-size * 0.1, 0);
    corePath.lineTo(-size * 0.2, size * 0.2);
    corePath.close();

    canvas.drawPath(corePath, paint);

    canvas.restore();
  }
};

/**
 * Skia shape drawer for particle.
 * @public
 */
export const drawSkiaParticle: ShapeDrawer<any, GeometryWarsComponentRegistry> = defineSkiaShape(
  { defaultSize: 3, defaultColor: "#ffffff", style: "fill" },
  (canvas, paint, size) => {
    canvas.drawRect(Skia.XYWHRect(-size / 2, -size / 2, size, size), paint);
  }
);

/**
 * Skia shape drawer for the Chaser enemy.
 * @public
 */
export const drawSkiaChaser: ShapeDrawer<any, GeometryWarsComponentRegistry> = defineSkiaShape(
  { defaultSize: 14, defaultColor: "#ff00ff", strokeWidth: 2.0 },
  (canvas, paint, size) => {
    const path = Skia.Path.Make();
    path.moveTo(0, -size);
    path.lineTo(size, 0);
    path.lineTo(0, size);
    path.lineTo(-size, 0);
    path.close();
    canvas.drawPath(path, paint);
  }
);

/**
 * Skia shape drawer for the Evader enemy.
 * @public
 */
export const drawSkiaEvader: ShapeDrawer<any, GeometryWarsComponentRegistry> = defineSkiaShape(
  { defaultSize: 14, defaultColor: "#ffaa00", strokeWidth: 2.0 },
  (canvas, paint, size) => {
    const path = Skia.Path.Make();
    path.moveTo(size, 0);
    path.lineTo(-size / 2, -size / 2);
    path.lineTo(-size / 2, size / 2);
    path.close();
    canvas.drawPath(path, paint);
  }
);

/**
 * Skia shape drawer for the Grunt enemy.
 * @public
 */
export const drawSkiaGrunt: ShapeDrawer<any, GeometryWarsComponentRegistry> = defineSkiaShape(
  { defaultSize: 10, defaultColor: "#00ffff", strokeWidth: 1.5 },
  (canvas, paint, size) => {
    const path = Skia.Path.Make();
    path.moveTo(size, 0);
    path.lineTo(-size, -size * 0.7);
    path.lineTo(-size, size * 0.7);
    path.close();
    canvas.drawPath(path, paint);
  }
);

/**
 * Skia shape drawer for the bullets.
 * @public
 */
export const drawSkiaBullet: ShapeDrawer<any, GeometryWarsComponentRegistry> = {
  draw(canvas, world, entity) {
    if (!ensureSkiaAvailable()) return;
    const render = getRenderGuard(world, entity);
    const transform = getDrawableTransform(world, entity);
    const paint = getPaint();
    if (!render || !transform || !paint) return;

    const size = render.size ?? 4;
    const color = render.color ?? "#ffff00";
    const bx = transform.worldX ?? transform.x;
    const by = transform.worldY ?? transform.y;

    gwBulletSkiaTrail.update(entity, bx, by, 2);
    gwBulletSkiaTrail.drawSkia(canvas, paint, entity, bx, by, 8, size, color, "#ffffff");

    canvas.save();
    setupSkiaStrokePaint(paint, color, 1.5, render.opacity ?? 1.0);
    canvas.drawLine(-size, 0, size, 0, paint);
    canvas.restore();
  }
};

/**
 * Skia shape drawer for enemy seeker (neon diamond/star).
 * @public
 */
export const drawSkiaEnemySeeker: ShapeDrawer<any, GeometryWarsComponentRegistry> = defineSkiaShape(
  { defaultSize: 12, defaultColor: "#ff00ff", strokeWidth: 1.5 },
  (canvas, paint, size) => {
    const path = Skia.Path.Make();
    path.moveTo(0, -size);
    path.lineTo(size / 2, 0);
    path.lineTo(0, size);
    path.lineTo(-size / 2, 0);
    path.close();
    canvas.drawPath(path, paint);
  }
);

/**
 * Skia shape drawer for enemy evader (neon square).
 * @public
 */
export const drawSkiaEnemyEvader: ShapeDrawer<any, GeometryWarsComponentRegistry> = defineSkiaShape(
  { defaultSize: 12, defaultColor: "#00ff00", strokeWidth: 1.5 },
  (canvas, paint, size) => {
    canvas.drawRect(Skia.XYWHRect(-size / 2, -size / 2, size, size), paint);
  }
);

/**
 * Skia shape drawer for enemy fast seeker (neon arrow/triangle).
 * @public
 */
export const drawSkiaEnemyFastSeeker: ShapeDrawer<any, GeometryWarsComponentRegistry> = defineSkiaShape(
  { defaultSize: 8, defaultColor: "#ff0000", strokeWidth: 1.5 },
  (canvas, paint, size) => {
    const path = Skia.Path.Make();
    path.moveTo(size, 0);
    path.lineTo(-size, -size / 2);
    path.lineTo(-size / 2, 0);
    path.lineTo(-size, size / 2);
    path.close();
    canvas.drawPath(path, paint);
  }
);

// ============================================================================
// GEOMETRY WARS BACKGROUND NEON DEFORMING GRID EFFECT (SKIA)
// ============================================================================

/**
 * Skia-based high-fidelity deforming glowing neon blue background grid.
 * @public
 */
export const drawSkiaGeometryWarsBackground: EffectDrawer<any, GeometryWarsComponentRegistry> = {
  draw(canvas, world) {
    if (!ensureSkiaAvailable()) return;
    const screen = world.getResource<{ width: number; height: number }>("ScreenConfig") || { width: 800, height: 600 };
    const { width, height } = screen;

    // 1. Frame prologue: update particles, monitor bullet trails, resolve grid displacement context
    const { playerX, playerY, bulletCount } = prepareGeometryWarsFramePrologue(world, width, height, "#ffff00", "#ff00ff");

    // 2. Process visual particles drawings
    drawVisualParticles(canvas);

    // 3. Draw Deforming Grid Lines via Skia DrawLine
    const paint = getPaint();
    paint.reset();
    paint.setAntiAlias(true);
    paint.setStyle(Skia.PaintStyle.Stroke);
    paint.setColor(Skia.Color("rgba(0, 160, 255, 0.16)"));
    paint.setStrokeWidth(0.8);

    canvas.save();

    // Draw horizontal grid lines
    for (let y = 0; y <= height; y += 40) {
      let lastX = 0;
      let lastY = 0;
      let first = true;
      for (let x = 0; x <= width; x += 25) {
        const displaced = getDisplacedPoint(x, y, playerX, playerY, BULLET_COORDS, bulletCount);
        if (first) {
          lastX = displaced.x;
          lastY = displaced.y;
          first = false;
        } else {
          canvas.drawLine(lastX, lastY, displaced.x, displaced.y, paint);
          lastX = displaced.x;
          lastY = displaced.y;
        }
      }
    }

    // Draw vertical grid lines
    for (let x = 0; x <= width; x += 40) {
      let lastX = 0;
      let lastY = 0;
      let first = true;
      for (let y = 0; y <= height; y += 25) {
        const displaced = getDisplacedPoint(x, y, playerX, playerY, BULLET_COORDS, bulletCount);
        if (first) {
          lastX = displaced.x;
          lastY = displaced.y;
          first = false;
        } else {
          canvas.drawLine(lastX, lastY, displaced.x, displaced.y, paint);
          lastX = displaced.x;
          lastY = displaced.y;
        }
      }
    }

    canvas.restore();
  }
};
