import { ShapeDrawer, EffectDrawer, RenderContext } from "@tiny-aster/core";
import type { ShmupComponentRegistry } from "../types/ShmupTypes";
import { Skia, getPaint } from "../../shared/rendering/SkiaContext";
import {
  computeShmupStarfield,
  resolveShmupPlayerDrawContext,
  resolveShmupEnemyDrawContext,
  resolveShmupBulletDrawContext,
} from "./ShmupVisualHelpers";

export const drawSkiaShmupPlayer: ShapeDrawer<RenderContext, ShmupComponentRegistry> = {
  draw(canvas, world, entity) {
    if (!Skia) return;
    const pCtx = resolveShmupPlayerDrawContext(world, entity);
    if (!pCtx || pCtx.shouldBlink) return;

    const { invulnerable, time, size, primaryColor } = pCtx;
    const skCanvas = canvas as any;
    const paint = getPaint();

    skCanvas.save();

    // Invulnerability shield aura
    if (invulnerable) {
      paint.reset();
      paint.setAntiAlias(true);
      paint.setStyle(Skia.PaintStyle.Stroke);
      paint.setColor(Skia.Color("#00ffff"));
      paint.setStrokeWidth(2.5);
      skCanvas.drawCircle(0, 0, size * 1.35, paint);
    }

    // Engine Thruster Flame
    const flicker = 0.8 + 0.4 * Math.sin(time * 30);
    const plumeLength = size * 0.9 * flicker;

    paint.reset();
    paint.setAntiAlias(true);
    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color("#ffaa00"));

    const flamePath = Skia.Path.Make();
    flamePath.moveTo(-size * 0.25, size * 0.5);
    flamePath.lineTo(size * 0.25, size * 0.5);
    flamePath.lineTo(0, size * 0.5 + plumeLength);
    flamePath.close();
    skCanvas.drawPath(flamePath, paint);

    // Thruster core
    paint.setColor(Skia.Color("#ffffff"));
    const flameCorePath = Skia.Path.Make();
    flameCorePath.moveTo(-size * 0.15, size * 0.5);
    flameCorePath.lineTo(size * 0.15, size * 0.5);
    flameCorePath.lineTo(0, size * 0.5 + plumeLength * 0.5);
    flameCorePath.close();
    skCanvas.drawPath(flameCorePath, paint);

    // Main Fighter Hull
    paint.reset();
    paint.setAntiAlias(true);
    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color(primaryColor));

    const jetPath = Skia.Path.Make();
    jetPath.moveTo(0, -size * 1.1);
    jetPath.lineTo(size * 0.95, size * 0.75);
    jetPath.lineTo(size * 0.45, size * 0.45);
    jetPath.lineTo(0, size * 0.65);
    jetPath.lineTo(-size * 0.45, size * 0.45);
    jetPath.lineTo(-size * 0.95, size * 0.75);
    jetPath.close();
    skCanvas.drawPath(jetPath, paint);

    // Wing accent lines
    paint.setStyle(Skia.PaintStyle.Stroke);
    paint.setColor(Skia.Color("#ffffff"));
    paint.setStrokeWidth(1.5);

    skCanvas.drawLine(0, -size * 0.7, size * 0.6, size * 0.5, paint);
    skCanvas.drawLine(0, -size * 0.7, -size * 0.6, size * 0.5, paint);

    // Cockpit Glass Canopy
    paint.reset();
    paint.setAntiAlias(true);
    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color("#e0ffff"));
    skCanvas.drawOval(Skia.XYWHRect(-size * 0.22, -size * 0.65, size * 0.44, size * 0.9), paint);

    skCanvas.restore();
  }
};

export const drawSkiaShmupEnemy: ShapeDrawer<RenderContext, ShmupComponentRegistry> = {
  draw(canvas, world, entity) {
    if (!Skia) return;
    const eCtx = resolveShmupEnemyDrawContext(world, entity);
    if (!eCtx) return;

    const { path, size, enemyColor, time } = eCtx;
    const skCanvas = canvas as any;
    const paint = getPaint();

    skCanvas.save();

    // Engine glow at top
    const pulse = 0.8 + 0.3 * Math.sin(time * 20 + entity);
    paint.reset();
    paint.setAntiAlias(true);
    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color("#ff9900"));
    skCanvas.drawCircle(0, -size * 0.5, size * 0.25 * pulse, paint);

    // Main Enemy Silhouette
    paint.setColor(Skia.Color(enemyColor));
    const enemyPath = Skia.Path.Make();
    enemyPath.moveTo(0, size * 1.1);
    enemyPath.lineTo(size * 0.9, -size * 0.2);
    enemyPath.lineTo(size * 0.4, -size * 0.85);
    enemyPath.lineTo(0, -size * 0.5);
    enemyPath.lineTo(-size * 0.4, -size * 0.85);
    enemyPath.lineTo(-size * 0.9, -size * 0.2);
    enemyPath.close();
    skCanvas.drawPath(enemyPath, paint);

    // Cannons on wingtips
    paint.setColor(Skia.Color("#ffffff"));
    skCanvas.drawRect(Skia.XYWHRect(size * 0.8, -size * 0.2, size * 0.12, size * 0.6), paint);
    skCanvas.drawRect(Skia.XYWHRect(-size * 0.92, -size * 0.2, size * 0.12, size * 0.6), paint);

    // Glowing Central Core
    paint.setColor(Skia.Color(path?.kind === "sine" ? "#ffe600" : "#ffffff"));
    skCanvas.drawCircle(0, 0, size * 0.28, paint);

    skCanvas.restore();
  }
};

export const drawSkiaShmupPlayerBullet: ShapeDrawer<RenderContext, ShmupComponentRegistry> = {
  draw(canvas, world, entity) {
    if (!Skia) return;
    const bCtx = resolveShmupBulletDrawContext(world, entity, 4, "#ffe600");
    if (!bCtx) return;

    const { size, color } = bCtx;
    const skCanvas = canvas as any;
    const paint = getPaint();

    skCanvas.save();

    // Outer plasma aura
    paint.reset();
    paint.setAntiAlias(true);
    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color(color));
    skCanvas.drawRect(Skia.XYWHRect(-size * 0.75, -size * 2.5, size * 1.5, size * 5), paint);

    // Core laser beam
    paint.setColor(Skia.Color("#ffffff"));
    skCanvas.drawRect(Skia.XYWHRect(-size * 0.35, -size * 2, size * 0.7, size * 4), paint);

    skCanvas.restore();
  }
};

export const drawSkiaShmupEnemyBullet: ShapeDrawer<RenderContext, ShmupComponentRegistry> = {
  draw(canvas, world, entity) {
    if (!Skia) return;
    const bCtx = resolveShmupBulletDrawContext(world, entity, 5, "#ff5a5a");
    if (!bCtx) return;

    const { size, color } = bCtx;
    const skCanvas = canvas as any;
    const paint = getPaint();

    skCanvas.save();

    // Hazard plasma orb
    paint.reset();
    paint.setAntiAlias(true);
    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color(color));
    skCanvas.drawCircle(0, 0, size, paint);

    // Core
    paint.setColor(Skia.Color("#ffffff"));
    skCanvas.drawCircle(0, 0, size * 0.45, paint);

    skCanvas.restore();
  }
};

export const drawSkiaShmupStarfield: EffectDrawer<RenderContext, ShmupComponentRegistry> = {
  draw(canvas, world) {
    if (!Skia) return;
    const { width, height, stars } = computeShmupStarfield(world);
    const skCanvas = canvas as any;
    const paint = getPaint();

    skCanvas.save();

    // Deep space background
    paint.reset();
    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color("#070a14"));
    skCanvas.drawRect(Skia.XYWHRect(0, 0, width, height), paint);

    for (let i = 0; i < stars.length; i++) {
      const star = stars[i]!;
      paint.setColor(Skia.Color(star.color));
      skCanvas.drawRect(Skia.XYWHRect(star.rawX, star.y, star.w, star.h), paint);
    }

    skCanvas.restore();
  }
};
