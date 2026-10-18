import { ShapeDrawer, EffectDrawer, RenderContext, World, resolveThemeColorWithFallback } from "@tiny-aster/core";
import { GeometryWarsComponentRegistry } from "../types/GeometryWarsRegistry";
import { colors } from "../../../theme/colors";
import { getDisplacedPoint, BULLET_COORDS } from "../../shared/rendering/ProceduralShapeUtils";
import { resolveInvulnerabilityPulse } from "../../shared/rendering/RenderUtils";
import { ensureSkiaAvailable, getRenderGuard, getDrawableTransform, fillSkiaPaint } from "../../shared/rendering/renderingUtils";
import {
  getActiveParticles,
  updatePlayerShipVisuals,
  prepareGeometryWarsFramePrologue,
  GEOMETRY_WARS_PARTICLE_POOL,
  spawnVisualParticle,
  resetVisualState
} from "./GeometryWarsVisualLogic";

import { Skia, getPaint, SkCanvas, SkPaint } from "../../shared/rendering/SkiaContext";

// For backwards compatibility if imported elsewhere
export {
  GEOMETRY_WARS_PARTICLE_POOL as GEOMETRY_WARS_SKIA_PARTICLE_POOL,
  spawnVisualParticle as spawnSkiaVisualParticle,
  resetVisualState
};

/**
 * Draws all active particles with neon glow.
 */
function drawVisualParticles(canvas: SkCanvas): void {
  if (!ensureSkiaAvailable()) return;
  const paint = getPaint();

  const particles = getActiveParticles();
  canvas.save();
  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    if (!p.active) continue;

    const ratio = p.life / p.maxLife;
    fillSkiaPaint(paint, "fill", p.color);
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

function setupSkiaStrokePaint(paint: SkPaint, color: string, strokeWidth = 1.5, opacity = 1.0): void {
  fillSkiaPaint(paint, "stroke", color, strokeWidth);
  paint.setAlphaf(opacity);
}

function resolveSkiaShapeSetup(
  world: World<GeometryWarsComponentRegistry>,
  entity: number,
  defaultSize: number,
  colorKey: string,
  fallbackColor: string,
  strokeWidth = 1.5
) {
  if (!ensureSkiaAvailable()) return null;
  const render = getRenderGuard(world, entity);
  if (!render) return null;

  const size = render.size ?? defaultSize;
  const color = resolveThemeColorWithFallback(world, render.color ?? fallbackColor, colorKey, "enemy", "accent");

  const paint = getPaint();
  setupSkiaStrokePaint(paint, color, strokeWidth);

  return { render, size, color, paint };
}

function drawSkiaPathShape(
  canvas: SkCanvas,
  setup: { size: number; paint: SkPaint } | null,
  getPoints: (size: number) => Array<[number, number]>
): void {
  if (!setup) return;
  const { size, paint } = setup;
  canvas.save();
  const path = Skia.Path.Make();
  const pts = getPoints(size);
  if (pts.length > 0) {
    path.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) {
      path.lineTo(pts[i][0], pts[i][1]);
    }
    path.close();
  }
  canvas.drawPath(path, paint);
  canvas.restore();
}

/**
 * Skia shape drawer for the player ship.
 * @public
 */
export const drawSkiaPlayerShip: ShapeDrawer<SkCanvas, GeometryWarsComponentRegistry> = {
  draw(canvas, world, entity) {
    if (!ensureSkiaAvailable()) return;

    const render = getRenderGuard(world, entity);
    if (!render) return;

    const transform = getDrawableTransform(world, entity);
    if (!transform) return;

    const player = world.getComponent(entity, "Player");
    if (!player) return;

    const size = render.size ?? 16;
    const color = resolveThemeColorWithFallback(world, render.color ?? colors.cyan, "player", "player-ship", "primary");

    const x = transform.worldX ?? transform.x;
    const y = transform.worldY ?? transform.y;

    // Trigger thruster smoke/engine particles and muzzle flash sparks
    updatePlayerShipVisuals(world, entity, render, x, y, color);

    const paint = getPaint();
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
    fillSkiaPaint(paint, "fill", colors.white);
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
export const drawSkiaParticle: ShapeDrawer<SkCanvas, GeometryWarsComponentRegistry> = {
  draw(canvas, world, entity) {
    if (!ensureSkiaAvailable()) return;
    const render = getRenderGuard(world, entity);
    if (!render) return;

    const size = render.size ?? 3;
    const color = resolveThemeColorWithFallback(world, render.color ?? colors.white, "particle");

    const paint = getPaint();
    canvas.save();
    fillSkiaPaint(paint, "fill", color);
    canvas.drawRect(Skia.XYWHRect(-size / 2, -size / 2, size, size), paint);
    canvas.restore();
  }
};

/**
 * Skia shape drawer for the Chaser enemy.
 * @public
 */
export const drawSkiaChaser: ShapeDrawer<SkCanvas, GeometryWarsComponentRegistry> = {
  draw(canvas, world, entity) {
    drawSkiaPathShape(
      canvas,
      resolveSkiaShapeSetup(world, entity, 14, "chaser", colors.magenta, 2.0),
      (size) => [[0, -size], [size, 0], [0, size], [-size, 0]]
    );
  }
};

/**
 * Skia shape drawer for the Evader enemy.
 * @public
 */
export const drawSkiaEvader: ShapeDrawer<SkCanvas, GeometryWarsComponentRegistry> = {
  draw(canvas, world, entity) {
    drawSkiaPathShape(
      canvas,
      resolveSkiaShapeSetup(world, entity, 14, "evader", colors.warning, 2.0),
      (size) => [[size, 0], [-size / 2, -size / 2], [-size / 2, size / 2]]
    );
  }
};

/**
 * Skia shape drawer for the Grunt enemy.
 * @public
 */
export const drawSkiaGrunt: ShapeDrawer<SkCanvas, GeometryWarsComponentRegistry> = {
  draw(canvas, world, entity) {
    drawSkiaPathShape(
      canvas,
      resolveSkiaShapeSetup(world, entity, 10, "grunt", colors.cyan, 1.5),
      (size) => [[size, 0], [-size, -size * 0.7], [-size, size * 0.7]]
    );
  }
};

/**
 * Skia shape drawer for the bullets.
 * @public
 */
export const drawSkiaBullet: ShapeDrawer<SkCanvas, GeometryWarsComponentRegistry> = {
  draw(canvas, world, entity) {
    if (!ensureSkiaAvailable()) return;
    const render = getRenderGuard(world, entity);
    if (!render) return;

    const size = render.size ?? 4;
    const color = resolveThemeColorWithFallback(world, render.color ?? colors.yellow, "bullet", "player-bullet", "secondary");

    const paint = getPaint();
    canvas.save();
    setupSkiaStrokePaint(paint, color, 1.5);

    canvas.drawLine(-size, 0, size, 0, paint);
    canvas.restore();
  }
};

/**
 * Skia shape drawer for enemy seeker (neon diamond/star).
 * @public
 */
export const drawSkiaEnemySeeker: ShapeDrawer<SkCanvas, GeometryWarsComponentRegistry> = {
  draw(canvas, world, entity) {
    drawSkiaPathShape(
      canvas,
      resolveSkiaShapeSetup(world, entity, 12, "seeker", colors.magenta, 1.5),
      (size) => [[0, -size], [size / 2, 0], [0, size], [-size / 2, 0]]
    );
  }
};

/**
 * Skia shape drawer for enemy evader (neon square).
 * @public
 */
export const drawSkiaEnemyEvader: ShapeDrawer<SkCanvas, GeometryWarsComponentRegistry> = {
  draw(canvas, world, entity) {
    const setup = resolveSkiaShapeSetup(world, entity, 12, "evader", colors.green, 1.5);
    if (!setup) return;
    const { size, paint } = setup;

    canvas.save();

    canvas.drawRect(Skia.XYWHRect(-size / 2, -size / 2, size, size), paint);
    canvas.restore();
  }
};

/**
 * Skia shape drawer for enemy fast seeker (neon arrow/triangle).
 * @public
 */
export const drawSkiaEnemyFastSeeker: ShapeDrawer<SkCanvas, GeometryWarsComponentRegistry> = {
  draw(canvas, world, entity) {
    drawSkiaPathShape(
      canvas,
      resolveSkiaShapeSetup(world, entity, 8, "fast_seeker", colors.danger, 1.5),
      (size) => [[size, 0], [-size, -size / 2], [-size / 2, 0], [-size, size / 2]]
    );
  }
};

// ============================================================================
// GEOMETRY WARS BACKGROUND NEON DEFORMING GRID EFFECT (SKIA)
// ============================================================================

function drawDisplacedGridLines(
  canvas: SkCanvas,
  width: number,
  height: number,
  isVertical: boolean,
  playerX: number,
  playerY: number,
  bulletCount: number,
  paint: SkPaint
): void {
  const outerMax = isVertical ? width : height;
  const innerMax = isVertical ? height : width;
  const outerStep = 40;
  const innerStep = 25;

  for (let outer = 0; outer <= outerMax; outer += outerStep) {
    let lastX = 0;
    let lastY = 0;
    let first = true;
    for (let inner = 0; inner <= innerMax; inner += innerStep) {
      const sampleX = isVertical ? outer : inner;
      const sampleY = isVertical ? inner : outer;
      const displaced = getDisplacedPoint(sampleX, sampleY, playerX, playerY, BULLET_COORDS, bulletCount);
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
}

/**
 * Skia-based high-fidelity deforming glowing neon blue background grid.
 * @public
 */
export const drawSkiaGeometryWarsBackground: EffectDrawer<SkCanvas, GeometryWarsComponentRegistry> = {
  draw(canvas, world) {
    if (!ensureSkiaAvailable()) return;
    const screen = world.getResource<{ width: number; height: number }>("ScreenConfig") || { width: 800, height: 600 };
    const { width, height } = screen;

    // 1. Frame prologue: update particles, monitor bullet trails, resolve grid displacement context
    const { playerX, playerY, bulletCount } = prepareGeometryWarsFramePrologue(world, width, height, colors.yellow, colors.magenta);

    // 2. Process visual particles drawings
    drawVisualParticles(canvas);

    // 3. Draw Deforming Grid Lines via Skia DrawLine
    const paint = getPaint();
    fillSkiaPaint(paint, "stroke", colors.border, 0.8);

    canvas.save();

    drawDisplacedGridLines(canvas, width, height, false, playerX, playerY, bulletCount, paint);
    drawDisplacedGridLines(canvas, width, height, true, playerX, playerY, bulletCount, paint);

    canvas.restore();
  }
};
