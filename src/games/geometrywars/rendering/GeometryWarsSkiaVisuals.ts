import { ShapeDrawer, EffectDrawer, World, ComponentRegistry } from "@tiny-aster/core";
import { GeometryWarsComponentRegistry } from "../types/GeometryWarsRegistry";
import { getDisplacedPoint, BULLET_COORDS } from "../../shared/rendering/ProceduralShapeUtils";
import { resolveInvulnerabilityPulse } from "../../shared/rendering/RenderUtils";
import { ensureSkiaAvailable, getRenderGuard, getDrawableTransform, defineSkiaShape } from "../../shared/rendering/renderingUtils";
import { createParticlePool, VisualParticlePool } from "../../shared/rendering/VisualParticlePool";
import { resolveGridDisplacementContext, monitorBulletsAndSpawnTrails } from "./GeometryWarsRenderUtils";

import { Skia, getPaint } from "../../shared/rendering/SkiaContext";

// ============================================================================
// ZERO-ALLOCATION FILE-LEVEL PRE-ALLOCATED VISUAL PARTICLE POOL
// ============================================================================

export const GEOMETRY_WARS_SKIA_PARTICLE_POOL: VisualParticlePool = createParticlePool(250);

/**
 * Spawns a custom particle from our zero-allocation pool.
 */
export function spawnSkiaVisualParticle(
  x: number,
  y: number,
  vx: number,
  vy: number,
  maxLife: number,
  size: number,
  color: string
): void {
  GEOMETRY_WARS_SKIA_PARTICLE_POOL.spawn(x, y, vx, vy, maxLife, size, color);
}

/**
 * Updates active particles with friction and limits.
 */
function updateVisualParticles(dt: number = 0.016): void {
  GEOMETRY_WARS_SKIA_PARTICLE_POOL.update(dt, (p) => {
    p.vx *= 0.94; // friction
    p.vy *= 0.94;
  });
}

/**
 * Draws all active particles with neon glow.
 */
function drawVisualParticles(canvas: any): void {
  if (!ensureSkiaAvailable()) return;
  const paint = getPaint();

  const particles = GEOMETRY_WARS_SKIA_PARTICLE_POOL.getActiveParticles();
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

    // Trigger thruster smoke/engine particles trailing behind on movement
    const velocity = world.getComponent(entity, "Velocity");
    if (velocity && (Math.abs(velocity.vx) > 10 || Math.abs(velocity.vy) > 10)) {
      if (world.tick % 3 === 0) {
        const angle = Math.atan2(velocity.vy, velocity.vx) + Math.PI; // opposite direction
        const spreadAngle = angle + (world.renderRandom.next() - 0.5) * 0.4;
        const pSpeed = world.renderRandom.nextRange(30, 80);
        const pvx = Math.cos(spreadAngle) * pSpeed;
        const pvy = Math.sin(spreadAngle) * pSpeed;
        spawnSkiaVisualParticle(
          x - Math.cos(angle) * 8,
          y - Math.sin(angle) * 8,
          pvx,
          pvy,
          world.renderRandom.nextRange(0.3, 0.6),
          world.renderRandom.nextRange(2.5, 4.0),
          "#00f0ff"
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
            spawnSkiaVisualParticle(
              noseX,
              noseY,
              Math.cos(spreadAngle) * pSpeed,
              Math.sin(spreadAngle) * pSpeed,
              world.renderRandom.nextRange(0.15, 0.35),
              world.renderRandom.nextRange(2.0, 3.5),
              "#ffffff"
            );
          }
        }
      }
    }

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
 * Skia shape drawer for the Grunt enemy.
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
export const drawSkiaBullet: ShapeDrawer<any, GeometryWarsComponentRegistry> = defineSkiaShape(
  { defaultSize: 4, defaultColor: "#ffff00", strokeWidth: 1.5 },
  (canvas, paint, size) => {
    canvas.drawLine(-size, 0, size, 0, paint);
  }
);

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

    // 1. Process visual particles updates and drawings
    updateVisualParticles();
    drawVisualParticles(canvas);

    // 2. Monitor bullet states for trail and explosion spawns
    monitorBulletsAndSpawnTrails(world, spawnSkiaVisualParticle, "#ffff00", "#ff00ff");

    // 3. Resolve grid displacement context
    const { playerX, playerY, bulletCount } = resolveGridDisplacementContext(world, width, height);

    // 5. Draw Deforming Grid Lines via Skia DrawLine
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
