import { ShapeDrawer, EffectDrawer, RenderContext } from "@tiny-aster/core";
import type { ShmupComponentRegistry } from "../types/ShmupTypes";
import type { ShmupConfig } from "../types/ShmupConfigSchema";
import { Skia, getPaint } from "../../shared/rendering/SkiaContext";

export const drawSkiaShmupPlayer: ShapeDrawer<RenderContext, ShmupComponentRegistry> = {
  draw(canvas, world, entity) {
    if (!Skia) return;
    const render = world.getComponent(entity, "Render");
    if (!render) return;
    const health = world.getComponent(entity, "Health");
    const invulnerable = (health?.invulnerableRemaining ?? 0) > 0;
    const time = world.tick * 0.016;

    // Blink effect when invulnerable
    if (invulnerable && Math.floor(time * 20) % 2 === 0) {
      return;
    }

    const size = render.size ?? 22;
    const primaryColor = render.color ?? "#00e5ff";
    const skCanvas = canvas as RenderContext & Record<string, Function>;
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
    const render = world.getComponent(entity, "Render");
    if (!render) return;
    const path = world.getComponent(entity, "EnemyPath");
    const size = render.size ?? 24;
    const enemyColor = render.color ?? "#ff2a6d";
    const time = world.tick * 0.016;

    const skCanvas = canvas as RenderContext & Record<string, Function>;
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
    const render = world.getComponent(entity, "Render");
    if (!render) return;
    const size = render.size ?? 4;
    const color = render.color ?? "#ffe600";

    const skCanvas = canvas as RenderContext & Record<string, Function>;
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
    const render = world.getComponent(entity, "Render");
    if (!render) return;
    const size = render.size ?? 5;
    const color = render.color ?? "#ff5a5a";

    const skCanvas = canvas as RenderContext & Record<string, Function>;
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
    const config = world.getResource<ShmupConfig>("GameConfig");
    const width = config?.WORLD_WIDTH ?? 480;
    const height = config?.WORLD_HEIGHT ?? 854;
    const state = world.getSingleton("ShmupGameState");
    const time = world.tick * 0.016;
    const scroll = state?.scrollDistance ?? (time * (config?.SCROLL_SPEED ?? 80));

    const starCount = config?.STAR_COUNT ?? 80;
    const skCanvas = canvas as RenderContext & Record<string, Function>;
    const paint = getPaint();

    skCanvas.save();

    // Deep space background
    paint.reset();
    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color("#070a14"));
    skCanvas.drawRect(Skia.XYWHRect(0, 0, width, height), paint);

    for (let i = 0; i < starCount; i++) {
      const seedX = (i * 127.1 + 311.7) % 1;
      const seedY = (i * 269.5 + 183.3) % 1;

      const layer = i % 3;
      const speedMult = layer === 0 ? 0.4 : layer === 1 ? 1.0 : 1.8;
      const starSpeed = (config?.STAR_SPEED ?? 35) * speedMult;

      const rawX = seedX * width;
      const rawY = (seedY * height + scroll * (starSpeed / 35)) % height;
      const y = rawY < 0 ? rawY + height : rawY;

      if (layer === 0) {
        paint.setColor(Skia.Color("rgba(200, 220, 255, 0.35)"));
        skCanvas.drawRect(Skia.XYWHRect(rawX, y, 1, 1), paint);
      } else if (layer === 1) {
        paint.setColor(Skia.Color("rgba(0, 229, 255, 0.65)"));
        skCanvas.drawRect(Skia.XYWHRect(rawX, y, 1.5, 2), paint);
      } else {
        paint.setColor(Skia.Color("rgba(255, 255, 255, 0.9)"));
        skCanvas.drawRect(Skia.XYWHRect(rawX, y, 2, 4), paint);
      }
    }

    skCanvas.restore();
  }
};
