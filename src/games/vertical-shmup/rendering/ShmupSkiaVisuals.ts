import { ShapeDrawer, EffectDrawer, World } from "@tiny-aster/core";
import type { ShmupComponentRegistry } from "../types/ShmupTypes";
import { Skia, getPaint, type SkCanvas } from "../../shared/rendering/SkiaContext";
import { SHMUP_COLOR_TOKENS } from "./ShmupColorTokens";
import {
  computeShmupParallaxWorld,
  resolveShmupPlayerDrawContext,
  resolveShmupEnemyDrawContext,
  resolveShmupBulletDrawContext,
} from "./ShmupVisualHelpers";

export const drawSkiaShmupPlayer: ShapeDrawer<SkCanvas, ShmupComponentRegistry> = {
  draw(canvas, world, entity) {
    if (!Skia) return;
    const pCtx = resolveShmupPlayerDrawContext(world, entity);
    if (!pCtx || pCtx.shouldBlink) return;

    const { invulnerable, time, size, primaryColor, moveX, isShooting } = pCtx;
    const paint = getPaint();

    canvas.save();

    // Invulnerability shield aura
    if (invulnerable) {
      paint.reset();
      paint.setAntiAlias(true);
      paint.setStyle(Skia.PaintStyle.Stroke);
      paint.setColor(Skia.Color(SHMUP_COLOR_TOKENS.player.primary));
      paint.setStrokeWidth(2.5);
      canvas.drawCircle(0, 0, size * 1.35, paint);
    }

    // Outer Energy Separation Halo
    paint.reset();
    paint.setAntiAlias(true);
    paint.setStyle(Skia.PaintStyle.Stroke);
    paint.setColor(Skia.Color(SHMUP_COLOR_TOKENS.player.primary));
    paint.setStrokeWidth(2.0);
    canvas.drawCircle(0, 0, size * 1.08, paint);

    // Banking tilt
    const bankAngle = moveX * 0.22;
    canvas.rotate(bankAngle * (180 / Math.PI), 0, 0);

    // Thruster Plume
    const flicker = 0.85 + 0.3 * Math.sin(time * 32);
    const plumeLength = size * 0.95 * flicker;

    paint.reset();
    paint.setAntiAlias(true);
    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color(SHMUP_COLOR_TOKENS.player.secondary));

    const flamePath = Skia.Path.Make();
    flamePath.moveTo(-size * 0.25, size * 0.5);
    flamePath.lineTo(size * 0.25, size * 0.5);
    flamePath.lineTo(0, size * 0.5 + plumeLength);
    flamePath.close();
    canvas.drawPath(flamePath, paint);

    // Thruster Core
    paint.setColor(Skia.Color(SHMUP_COLOR_TOKENS.player.core));
    const flameCorePath = Skia.Path.Make();
    flameCorePath.moveTo(-size * 0.14, size * 0.5);
    flameCorePath.lineTo(size * 0.14, size * 0.5);
    flameCorePath.lineTo(0, size * 0.5 + plumeLength * 0.55);
    flameCorePath.close();
    canvas.drawPath(flameCorePath, paint);

    // Main Fighter Jet Hull
    paint.reset();
    paint.setAntiAlias(true);
    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color(primaryColor));

    const jetPath = Skia.Path.Make();
    jetPath.moveTo(0, -size * 1.15);
    jetPath.lineTo(size * 0.95, size * 0.75);
    jetPath.lineTo(size * 0.42, size * 0.48);
    jetPath.lineTo(0, size * 0.68);
    jetPath.lineTo(-size * 0.42, size * 0.48);
    jetPath.lineTo(-size * 0.95, size * 0.75);
    jetPath.close();
    canvas.drawPath(jetPath, paint);

    // Wing accent lines
    paint.setStyle(Skia.PaintStyle.Stroke);
    paint.setColor(Skia.Color(SHMUP_COLOR_TOKENS.player.core));
    paint.setStrokeWidth(1.8);

    canvas.drawLine(0, -size * 0.75, size * 0.65, size * 0.5, paint);
    canvas.drawLine(0, -size * 0.75, -size * 0.65, size * 0.5, paint);

    // Cockpit Glass Canopy
    paint.reset();
    paint.setAntiAlias(true);
    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color(SHMUP_COLOR_TOKENS.player.core));
    canvas.drawOval(Skia.XYWHRect(-size * 0.22, -size * 0.6, size * 0.44, size * 0.84), paint);

    if (isShooting) {
      paint.setColor(Skia.Color(SHMUP_COLOR_TOKENS.player.core));
      canvas.drawCircle(size * 0.7, -size * 0.1, 4.5, paint);
      canvas.drawCircle(-size * 0.7, -size * 0.1, 4.5, paint);
    }

    canvas.restore();
  }
};

export const drawSkiaShmupEnemy: ShapeDrawer<SkCanvas, ShmupComponentRegistry> = {
  draw(canvas, world, entity) {
    if (!Skia) return;
    const eCtx = resolveShmupEnemyDrawContext(world, entity);
    if (!eCtx) return;

    const { size, enemyColor, time, archetype, isTelegraphing } = eCtx;
    const paint = getPaint();

    canvas.save();

    if (isTelegraphing) {
      paint.reset();
      paint.setAntiAlias(true);
      paint.setStyle(Skia.PaintStyle.Stroke);
      paint.setColor(Skia.Color(SHMUP_COLOR_TOKENS.warning));
      paint.setStrokeWidth(2.5);
      const pulse = 1.1 + 0.2 * Math.sin(time * 25);
      canvas.drawCircle(0, 0, size * pulse, paint);
    }

    paint.reset();
    paint.setAntiAlias(true);
    paint.setStyle(Skia.PaintStyle.Fill);

    if (archetype === "scout") {
      paint.setColor(Skia.Color(SHMUP_COLOR_TOKENS.enemy.primary));
      const path = Skia.Path.Make();
      path.moveTo(0, size * 1.1);
      path.lineTo(size * 0.85, -size * 0.3);
      path.lineTo(size * 0.35, -size * 0.85);
      path.lineTo(0, -size * 0.5);
      path.lineTo(-size * 0.35, -size * 0.85);
      path.lineTo(-size * 0.85, -size * 0.3);
      path.close();
      canvas.drawPath(path, paint);

      paint.setColor(Skia.Color(SHMUP_COLOR_TOKENS.player.primary));
      canvas.drawCircle(size * 0.75, -size * 0.25, 3.5, paint);
      canvas.drawCircle(-size * 0.75, -size * 0.25, 3.5, paint);

      paint.setColor(Skia.Color(SHMUP_COLOR_TOKENS.enemy.accent));
      canvas.drawCircle(0, 0, size * 0.26, paint);

    } else if (archetype === "interceptor") {
      paint.setColor(Skia.Color(SHMUP_COLOR_TOKENS.enemy.primary));
      const path = Skia.Path.Make();
      path.moveTo(0, size * 1.25);
      path.lineTo(size * 0.65, -size * 0.5);
      path.lineTo(0, -size * 0.9);
      path.lineTo(-size * 0.65, -size * 0.5);
      path.close();
      canvas.drawPath(path, paint);

      paint.setColor(Skia.Color(SHMUP_COLOR_TOKENS.enemy.accent));
      canvas.drawCircle(0, -size * 0.1, size * 0.28, paint);

    } else if (archetype === "armored") {
      paint.setColor(Skia.Color(SHMUP_COLOR_TOKENS.architecture));
      const path = Skia.Path.Make();
      path.moveTo(0, size * 0.9);
      path.lineTo(size * 1.1, size * 0.3);
      path.lineTo(size * 0.9, -size * 0.8);
      path.lineTo(-size * 0.9, -size * 0.8);
      path.lineTo(-size * 1.1, size * 0.3);
      path.close();
      canvas.drawPath(path, paint);

      paint.setColor(Skia.Color(SHMUP_COLOR_TOKENS.gold.sunlight));
      canvas.drawCircle(0, 0, size * 0.38, paint);

    } else if (archetype === "support") {
      paint.setStyle(Skia.PaintStyle.Stroke);
      paint.setColor(Skia.Color(SHMUP_COLOR_TOKENS.enemy.accent));
      paint.setStrokeWidth(2.5);
      canvas.drawCircle(0, 0, size * 0.95, paint);

      paint.setStyle(Skia.PaintStyle.Fill);
      paint.setColor(Skia.Color(SHMUP_COLOR_TOKENS.enemy.primary));
      canvas.drawCircle(0, 0, size * 0.55, paint);

      paint.setColor(Skia.Color(SHMUP_COLOR_TOKENS.enemy.accent));
      canvas.drawCircle(0, 0, size * 0.28, paint);

    } else {
      paint.setColor(Skia.Color(SHMUP_COLOR_TOKENS.enemy.primary));
      const path = Skia.Path.Make();
      path.moveTo(0, size * 1.1);
      path.lineTo(size * 1.2, -size * 0.4);
      path.lineTo(size * 0.6, -size * 1.0);
      path.lineTo(-size * 0.6, -size * 1.0);
      path.lineTo(-size * 1.2, -size * 0.4);
      path.close();
      canvas.drawPath(path, paint);

      const corePulse = 0.85 + 0.3 * Math.sin(time * 10);
      paint.setColor(Skia.Color(SHMUP_COLOR_TOKENS.gold.sunlight));
      canvas.drawCircle(0, 0, size * 0.4 * corePulse, paint);
    }

    canvas.restore();
  }
};

export const drawSkiaShmupPlayerBullet: ShapeDrawer<SkCanvas, ShmupComponentRegistry> = {
  draw(canvas, world, entity) {
    if (!Skia) return;
    const bCtx = resolveShmupBulletDrawContext(world, entity, 6, SHMUP_COLOR_TOKENS.player.primary);
    if (!bCtx) return;

    const { size, color } = bCtx;
    const paint = getPaint();

    canvas.save();
    paint.reset();
    paint.setAntiAlias(true);
    paint.setStyle(Skia.PaintStyle.Fill);

    // Plasma aura
    paint.setColor(Skia.Color(color));
    canvas.drawRect(Skia.XYWHRect(-size * 0.75, -size * 2.5, size * 1.5, size * 5), paint);

    // Core laser
    paint.setColor(Skia.Color(SHMUP_COLOR_TOKENS.player.core));
    canvas.drawRect(Skia.XYWHRect(-size * 0.35, -size * 2, size * 0.7, size * 4), paint);

    canvas.restore();
  }
};

export const drawSkiaShmupEnemyBullet: ShapeDrawer<SkCanvas, ShmupComponentRegistry> = {
  draw(canvas, world, entity) {
    if (!Skia) return;
    const bCtx = resolveShmupBulletDrawContext(world, entity, 6, SHMUP_COLOR_TOKENS.bullet.warm);
    if (!bCtx) return;

    const { size, color, kind } = bCtx;
    const paint = getPaint();

    canvas.save();
    paint.reset();
    paint.setAntiAlias(true);
    paint.setStyle(Skia.PaintStyle.Fill);

    if (kind === "hot") {
      paint.setColor(Skia.Color(color));
      const path = Skia.Path.Make();
      path.moveTo(0, size * 1.8);
      path.lineTo(size * 0.7, -size * 1.0);
      path.lineTo(0, -size * 1.8);
      path.lineTo(-size * 0.7, -size * 1.0);
      path.close();
      canvas.drawPath(path, paint);

      paint.setColor(Skia.Color(SHMUP_COLOR_TOKENS.player.core));
      canvas.drawCircle(0, 0, size * 0.4, paint);

    } else if (kind === "special") {
      paint.setColor(Skia.Color(color));
      canvas.drawCircle(0, 0, size * 1.35, paint);

      paint.setColor(Skia.Color(SHMUP_COLOR_TOKENS.player.core));
      canvas.drawCircle(0, 0, size * 0.55, paint);

    } else {
      paint.setColor(Skia.Color(color));
      canvas.drawCircle(0, 0, size, paint);

      paint.setColor(Skia.Color(SHMUP_COLOR_TOKENS.player.core));
      canvas.drawCircle(0, 0, size * 0.45, paint);
    }

    canvas.restore();
  }
};

export const drawSkiaShmupStarfield: EffectDrawer<SkCanvas, ShmupComponentRegistry> = {
  draw(canvas, world) {
    if (!Skia) return;
    const { width, height, biome, clouds, islands, particles } = computeShmupParallaxWorld(world);
    const paint = getPaint();

    canvas.save();

    // Layer 1: Sky background
    paint.reset();
    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color(biome.skyMid));
    canvas.drawRect(Skia.XYWHRect(0, 0, width, height), paint);

    // Layer 2: Volumetric Clouds
    paint.setColor(Skia.Color(biome.cloudLight));
    for (const cloud of clouds) {
      canvas.drawOval(Skia.XYWHRect(cloud.x - cloud.rx, cloud.y - cloud.ry, cloud.rx * 2, cloud.ry * 2), paint);
    }

    // Layer 3: Floating Islands
    paint.setColor(Skia.Color(biome.islandColor));
    for (const island of islands) {
      canvas.drawRect(Skia.XYWHRect(island.x, island.y, island.width, island.height), paint);
    }

    // Central mist overlay
    paint.setColor(Skia.Color(SHMUP_COLOR_TOKENS.sky.mid));
    canvas.drawRect(Skia.XYWHRect(width * 0.15, 0, width * 0.7, height), paint);

    // Layer 4: Near Decor Particles
    for (const p of particles) {
      paint.setColor(Skia.Color(p.color));
      canvas.drawCircle(p.x, p.y, p.size * 0.5, paint);
    }

    canvas.restore();
  }
};
