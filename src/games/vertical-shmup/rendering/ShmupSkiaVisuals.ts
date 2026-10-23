import { ShapeDrawer, EffectDrawer } from "@tiny-aster/core";
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

    // Outer Energy Separation Halo (Dark outline + cyan energy ring)
    paint.reset();
    paint.setAntiAlias(true);
    paint.setStyle(Skia.PaintStyle.Stroke);
    paint.setColor(Skia.Color("rgba(0, 20, 40, 0.6)"));
    paint.setStrokeWidth(3.5);
    canvas.drawCircle(0, 0, size * 1.1, paint);

    paint.setColor(Skia.Color(SHMUP_COLOR_TOKENS.player.primary));
    paint.setStrokeWidth(1.8);
    canvas.drawCircle(0, 0, size * 1.1, paint);

    // Banking tilt
    const bankAngle = moveX * 0.22;
    canvas.rotate(bankAngle * (180 / Math.PI), 0, 0);

    // Twin Thruster Plumes
    const flicker = 0.85 + 0.28 * Math.sin(time * 36);
    const plumeLength = size * 0.95 * flicker;

    paint.reset();
    paint.setAntiAlias(true);
    paint.setStyle(Skia.PaintStyle.Fill);

    // Left Plume
    paint.setColor(Skia.Color(SHMUP_COLOR_TOKENS.player.secondary));
    const leftPlume = Skia.Path.Make();
    leftPlume.moveTo(-size * 0.35, size * 0.45);
    leftPlume.lineTo(-size * 0.15, size * 0.45);
    leftPlume.lineTo(-size * 0.25, size * 0.45 + plumeLength);
    leftPlume.close();
    canvas.drawPath(leftPlume, paint);

    // Right Plume
    const rightPlume = Skia.Path.Make();
    rightPlume.moveTo(size * 0.15, size * 0.45);
    rightPlume.lineTo(size * 0.35, size * 0.45);
    rightPlume.lineTo(size * 0.25, size * 0.45 + plumeLength);
    rightPlume.close();
    canvas.drawPath(rightPlume, paint);

    // Core Plumes
    paint.setColor(Skia.Color(SHMUP_COLOR_TOKENS.player.core));
    const leftCore = Skia.Path.Make();
    leftCore.moveTo(-size * 0.3, size * 0.45);
    leftCore.lineTo(-size * 0.2, size * 0.45);
    leftCore.lineTo(-size * 0.25, size * 0.45 + plumeLength * 0.55);
    leftCore.close();
    canvas.drawPath(leftCore, paint);

    const rightCore = Skia.Path.Make();
    rightCore.moveTo(size * 0.2, size * 0.45);
    rightCore.lineTo(size * 0.3, size * 0.45);
    rightCore.lineTo(size * 0.25, size * 0.45 + plumeLength * 0.55);
    rightCore.close();
    canvas.drawPath(rightCore, paint);

    // Main Fighter Jet Hull
    paint.reset();
    paint.setAntiAlias(true);
    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color(primaryColor));

    const jetPath = Skia.Path.Make();
    jetPath.moveTo(0, -size * 1.2);
    jetPath.lineTo(size * 0.25, -size * 0.4);
    jetPath.lineTo(size * 1.05, size * 0.4);
    jetPath.lineTo(size * 0.82, size * 0.72);
    jetPath.lineTo(size * 0.42, size * 0.45);
    jetPath.lineTo(size * 0.22, size * 0.65);
    jetPath.lineTo(0, size * 0.5);
    jetPath.lineTo(-size * 0.22, size * 0.65);
    jetPath.lineTo(-size * 0.42, size * 0.45);
    jetPath.lineTo(-size * 0.82, size * 0.72);
    jetPath.lineTo(-size * 1.05, size * 0.4);
    jetPath.lineTo(-size * 0.25, -size * 0.4);
    jetPath.close();
    canvas.drawPath(jetPath, paint);

    // Inner wing panel lines
    paint.setStyle(Skia.PaintStyle.Stroke);
    paint.setColor(Skia.Color(SHMUP_COLOR_TOKENS.player.core));
    paint.setStrokeWidth(1.6);
    canvas.drawLine(0, -size * 0.85, size * 0.75, size * 0.38, paint);
    canvas.drawLine(0, -size * 0.85, -size * 0.75, size * 0.38, paint);

    // Cockpit Glass Canopy
    paint.reset();
    paint.setAntiAlias(true);
    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color(SHMUP_COLOR_TOKENS.player.core));
    canvas.drawOval(Skia.XYWHRect(-size * 0.2, -size * 0.57, size * 0.4, size * 0.84), paint);

    if (isShooting) {
      paint.setColor(Skia.Color(SHMUP_COLOR_TOKENS.player.core));
      canvas.drawCircle(size * 0.85, -size * 0.05, 4.5, paint);
      canvas.drawCircle(-size * 0.85, -size * 0.05, 4.5, paint);
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
      const pulse = 1.12 + 0.18 * Math.sin(time * 25);
      canvas.drawCircle(0, 0, size * pulse, paint);
    }

    paint.reset();
    paint.setAntiAlias(true);
    paint.setStyle(Skia.PaintStyle.Fill);

    if (archetype === "scout") {
      paint.setColor(Skia.Color(SHMUP_COLOR_TOKENS.enemy.primary));
      const path = Skia.Path.Make();
      path.moveTo(0, size * 1.1);
      path.lineTo(size * 0.9, -size * 0.25);
      path.lineTo(size * 0.4, -size * 0.85);
      path.lineTo(0, -size * 0.5);
      path.lineTo(-size * 0.4, -size * 0.85);
      path.lineTo(-size * 0.9, -size * 0.25);
      path.close();
      canvas.drawPath(path, paint);

      paint.setColor(Skia.Color(SHMUP_COLOR_TOKENS.player.primary));
      canvas.drawCircle(size * 0.8, -size * 0.2, 3.5, paint);
      canvas.drawCircle(-size * 0.8, -size * 0.2, 3.5, paint);

      paint.setColor(Skia.Color(SHMUP_COLOR_TOKENS.enemy.accent));
      canvas.drawCircle(0, 0, size * 0.28, paint);

    } else if (archetype === "interceptor") {
      paint.setColor(Skia.Color(SHMUP_COLOR_TOKENS.enemy.primary));
      const path = Skia.Path.Make();
      path.moveTo(0, size * 1.25);
      path.lineTo(size * 0.7, -size * 0.45);
      path.lineTo(size * 0.2, -size * 0.85);
      path.lineTo(0, -size * 0.6);
      path.lineTo(-size * 0.2, -size * 0.85);
      path.lineTo(-size * 0.7, -size * 0.45);
      path.close();
      canvas.drawPath(path, paint);

      paint.setStyle(Skia.PaintStyle.Stroke);
      paint.setColor(Skia.Color(SHMUP_COLOR_TOKENS.enemy.accent));
      paint.setStrokeWidth(2.0);
      canvas.drawLine(0, size * 0.8, size * 0.55, -size * 0.3, paint);
      canvas.drawLine(0, size * 0.8, -size * 0.55, -size * 0.3, paint);

      paint.setStyle(Skia.PaintStyle.Fill);
      canvas.drawCircle(0, -size * 0.1, size * 0.28, paint);

    } else if (archetype === "armored") {
      paint.setColor(Skia.Color(SHMUP_COLOR_TOKENS.architecture));
      const path = Skia.Path.Make();
      path.moveTo(0, size * 0.95);
      path.lineTo(size * 1.15, size * 0.25);
      path.lineTo(size * 0.85, -size * 0.85);
      path.lineTo(-size * 0.85, -size * 0.85);
      path.lineTo(-size * 1.15, size * 0.25);
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
      path.moveTo(0, size * 1.15);
      path.lineTo(size * 1.25, -size * 0.35);
      path.lineTo(size * 0.7, -size * 1.0);
      path.lineTo(-size * 0.7, -size * 1.0);
      path.lineTo(-size * 1.25, -size * 0.35);
      path.close();
      canvas.drawPath(path, paint);

      const corePulse = 0.85 + 0.3 * Math.sin(time * 10);
      paint.setColor(Skia.Color(SHMUP_COLOR_TOKENS.gold.sunlight));
      canvas.drawCircle(0, 0, size * 0.42 * corePulse, paint);
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

    if (kind === "hot") {
      paint.setStyle(Skia.PaintStyle.Fill);
      paint.setColor(Skia.Color(color));
      const path = Skia.Path.Make();
      path.moveTo(0, size * 1.8);
      path.lineTo(size * 0.7, -size * 1.0);
      path.lineTo(0, -size * 1.8);
      path.lineTo(-size * 0.7, -size * 1.0);
      path.close();
      canvas.drawPath(path, paint);

      // Dark rim
      paint.setStyle(Skia.PaintStyle.Stroke);
      paint.setColor(Skia.Color(SHMUP_COLOR_TOKENS.enemy.primary));
      paint.setStrokeWidth(1.8);
      canvas.drawPath(path, paint);

      // White core
      paint.setStyle(Skia.PaintStyle.Fill);
      paint.setColor(Skia.Color(SHMUP_COLOR_TOKENS.player.core));
      canvas.drawCircle(0, 0, size * 0.4, paint);

    } else if (kind === "special") {
      paint.setStyle(Skia.PaintStyle.Fill);
      paint.setColor(Skia.Color(color));
      canvas.drawCircle(0, 0, size * 1.35, paint);

      paint.setStyle(Skia.PaintStyle.Stroke);
      paint.setColor(Skia.Color(SHMUP_COLOR_TOKENS.enemy.primary));
      paint.setStrokeWidth(1.8);
      canvas.drawCircle(0, 0, size * 1.35, paint);

      paint.setStyle(Skia.PaintStyle.Fill);
      paint.setColor(Skia.Color(SHMUP_COLOR_TOKENS.player.core));
      canvas.drawCircle(0, 0, size * 0.55, paint);

    } else {
      paint.setStyle(Skia.PaintStyle.Fill);
      paint.setColor(Skia.Color(color));
      canvas.drawCircle(0, 0, size, paint);

      paint.setStyle(Skia.PaintStyle.Stroke);
      paint.setColor(Skia.Color(SHMUP_COLOR_TOKENS.enemy.primary));
      paint.setStrokeWidth(1.8);
      canvas.drawCircle(0, 0, size, paint);

      paint.setStyle(Skia.PaintStyle.Fill);
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
    for (const cloud of clouds) {
      paint.setColor(Skia.Color(biome.cloudShadow));
      canvas.drawOval(Skia.XYWHRect(cloud.x - cloud.rx * 1.1, cloud.y - cloud.ry * 0.85 + cloud.ry * 0.2, cloud.rx * 2.2, cloud.ry * 1.7), paint);

      paint.setColor(Skia.Color(biome.cloudLight));
      canvas.drawCircle(cloud.x - cloud.rx * 0.35, cloud.y, cloud.ry * 0.75, paint);
      canvas.drawCircle(cloud.x, cloud.y - cloud.ry * 0.25, cloud.ry * 0.95, paint);
      canvas.drawCircle(cloud.x + cloud.rx * 0.35, cloud.y, cloud.ry * 0.75, paint);
    }

    // Layer 3: Floating Islands
    for (const island of islands) {
      paint.setColor(Skia.Color(SHMUP_COLOR_TOKENS.architecture));
      canvas.drawRect(Skia.XYWHRect(island.x, island.y + island.height * 0.3, island.width, island.height * 0.7), paint);

      paint.setColor(Skia.Color(island.color));
      canvas.drawRect(Skia.XYWHRect(island.x - 4, island.y, island.width + 8, island.height * 0.55), paint);
    }

    // Layer 4: Near Decor Particles
    for (const p of particles) {
      paint.setColor(Skia.Color(p.color));
      canvas.drawCircle(p.x, p.y, p.size * 0.5, paint);
    }

    canvas.restore();
  }
};
