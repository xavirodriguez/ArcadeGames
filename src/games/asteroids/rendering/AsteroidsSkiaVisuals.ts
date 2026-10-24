import { ShapeDrawer, RenderComponent, SHIP_FORWARD_AXIS, THEME_RESOURCE_KEY, Theme, resolveThemeColorWithFallback } from "@tiny-aster/core";
import { AsteroidsComponentRegistry } from "../types/AsteroidRegistry";
import { colors } from "../../../theme/colors";
import { computeAsteroidSilhouette, computeThrustFlame } from "../../shared/rendering/ProceduralShapeUtils";
import { resolveHitFlash, resolveInvulnerabilityPulse, resolveAsteroidHitFlash } from "../../shared/rendering/RenderUtils";
import { drawSkiaAsteroidsMissionHUD } from "./AsteroidsSkiaMissionHUD";
import { SkiaDrawAdapter } from "../../shared/rendering/DrawAdapter";
import { drawFromGeometryProfileAdapter } from "../../shared/rendering/GenericEntityDrawer";

import { Skia, getPaint, SkCanvas, SkPaint } from "../../shared/rendering/SkiaContext";
import type { SkPath } from "@shopify/react-native-skia";
import { getVisibleSkiaRender } from "../../shared/rendering/renderingUtils";
import { resolveAsteroidSaucerSetup, resolveAsteroidDrawSetup, resolvePlayerShipSetup, resolveCustomMotionData } from "./AsteroidsVisualHelpers";

export { drawSkiaAsteroidsMissionHUD };

// Memory-safe WeakMaps keyed by render components for zero-allocation Skia Path caching
const cachedShipPaths = new WeakMap<object, { ship: SkPath; cockpit: SkPath }>();
const cachedAsteroidPaths = new WeakMap<object, SkPath>();

function resolveAsteroidOpacityAndColor(render: RenderComponent, defaultColor: string): { opacity: number; colorStr: string } {
  return resolveAsteroidHitFlash(render, defaultColor);
}

function setupAsteroidStrokePaint(
  render: RenderComponent,
  defaultColor: string,
  strokeWidth = 2
): { opacity: number; colorStr: string; paint: SkPaint } {
  const { opacity, colorStr } = resolveAsteroidOpacityAndColor(render, defaultColor);
  const paint = getPaint();
  paint.reset();
  paint.setAntiAlias(true);
  paint.setStyle(Skia.PaintStyle.Stroke);
  paint.setColor(Skia.Color(colorStr));
  paint.setStrokeWidth(strokeWidth);
  paint.setAlphaf(opacity);
  return { opacity, colorStr, paint };
}

/**
 * Procedural player ship shape drawer for React Native Skia.
 * Supports Concept Pack parametric geometry override if available in active Theme.
 */
export const drawSkiaAsteroidsPlayerShip: ShapeDrawer<SkCanvas, AsteroidsComponentRegistry> = {
  draw(canvas, world, entity) {
    const setup = resolvePlayerShipSetup(world, getVisibleSkiaRender(world, entity), entity);
    if (!setup) return;

    const { render, customGeom, size, tick, isThrusting } = setup;

    canvas.save();

    let { opacity, colorStr } = resolveAsteroidOpacityAndColor(render, resolveThemeColorWithFallback(world, colors.cyan, "player-ship", "player", "primary"));

    // Invulnerability Pulse
    if (world.hasComponent(entity, "Invulnerable")) {
      const inv = world.getComponent(entity, "Invulnerable");
      const invState = resolveInvulnerabilityPulse(inv?.remaining, opacity, { mode: "time" });
      if (invState.isInvulnerable) {
        opacity = invState.opacity;
      }
    }

    if (customGeom) {
      const motionData = resolveCustomMotionData(customGeom, isThrusting, size, tick, world.renderRandom);
      if (motionData) {
        const pPaint = getPaint();
        pPaint.reset();
        pPaint.setAntiAlias(true);
        pPaint.setStyle(Skia.PaintStyle.Fill);

        for (let i = 0; i < motionData.particles.length; i++) {
          const p = motionData.particles[i];
          pPaint.setColor(Skia.Color(p.color));
          pPaint.setAlphaf(p.alpha * opacity);
          canvas.drawCircle(p.offsetX, p.offsetY, Math.max(0.5, p.radius), pPaint);
        }
      }

      const adapter = new SkiaDrawAdapter(canvas);
      drawFromGeometryProfileAdapter(adapter, customGeom, {
        size,
        baseColor: colorStr,
        globalAlpha: opacity,
        isThrusting,
        tick,
      });

      canvas.restore();
      return;
    }

    const paint = getPaint();
    paint.reset();
    paint.setAntiAlias(true);

    if (isThrusting) {
      const { flameLen, sparks } = computeThrustFlame(size, world.renderRandom);
      const sparkColor = resolveThemeColorWithFallback(world, colors.gold, "spark", "secondary");
      const thrustFlameColor = resolveThemeColorWithFallback(world, colors.orangeDark, "thrustFlame", "accent");
      const sparkCoreColor = resolveThemeColorWithFallback(world, colors.white, "spark", "primary");

      paint.setStyle(Skia.PaintStyle.Fill);
      paint.setColor(Skia.Color(sparkColor));
      paint.setAlphaf(opacity * 0.7);

      const flamePath = Skia.Path.Make();
      flamePath.moveTo(-size * 0.4, -size * 0.4);
      flamePath.lineTo(-(size * 0.4 + flameLen), 0);
      flamePath.lineTo(-size * 0.4, size * 0.4);
      flamePath.close();
      canvas.drawPath(flamePath, paint);

      paint.setStyle(Skia.PaintStyle.Stroke);
      paint.setColor(Skia.Color(thrustFlameColor));
      paint.setStrokeWidth(2);
      paint.setAlphaf(opacity);
      canvas.drawPath(flamePath, paint);

      paint.setStyle(Skia.PaintStyle.Fill);
      paint.setColor(Skia.Color(sparkCoreColor));
      paint.setAlphaf(opacity);
      for (let i = 0; i < sparks.length; i++) {
        const { sparkOffset, sparkY, sparkRadius } = sparks[i];
        canvas.drawCircle(-(size * 0.4 + sparkOffset), sparkY, sparkRadius, paint);
      }
    }

    let shipGeom = cachedShipPaths.get(render);
    if (!shipGeom) {
      const shipPath = Skia.Path.Make();
      shipPath.moveTo(size * SHIP_FORWARD_AXIS.x, size * SHIP_FORWARD_AXIS.y);
      shipPath.lineTo(-size * 0.7, size * 0.7);
      shipPath.lineTo(-size * 0.5, size * 0.3);
      shipPath.lineTo(-size * 0.5, -size * 0.3);
      shipPath.lineTo(-size * 0.7, -size * 0.7);
      shipPath.close();

      const cockpitPath = Skia.Path.Make();
      cockpitPath.moveTo(size * 0.3, 0);
      cockpitPath.lineTo(-size * 0.3, size * 0.3);
      cockpitPath.lineTo(-size * 0.3, -size * 0.3);
      cockpitPath.close();

      shipGeom = { ship: shipPath, cockpit: cockpitPath };
      cachedShipPaths.set(render, shipGeom);
    }

    paint.setStyle(Skia.PaintStyle.Stroke);
    paint.setColor(Skia.Color(colorStr));
    paint.setStrokeWidth(2);
    paint.setAlphaf(opacity);
    canvas.drawPath(shipGeom.ship, paint);

    canvas.drawPath(shipGeom.cockpit, paint);

    canvas.restore();
  }
};

/**
 * Procedural retro saucer UFO shape drawer for React Native Skia.
 */
export const drawSkiaAsteroidsUfo: ShapeDrawer<SkCanvas, AsteroidsComponentRegistry> = {
  draw(canvas, world, entity) {
    const setup = resolveAsteroidSaucerSetup(getVisibleSkiaRender(world, entity), resolveThemeColorWithFallback(world, colors.cyan, "ufo", "enemy"));
    if (!setup) return;

    const { render, radius } = setup;

    canvas.save();

    const { paint } = setupAsteroidStrokePaint(render, resolveThemeColorWithFallback(world, colors.cyan, "ufo", "enemy"), 2);

    const ufoPath = Skia.Path.Make();
    ufoPath.addOval({ x: -radius, y: -radius * 0.4, width: radius * 2, height: radius * 0.8 });
    canvas.drawPath(ufoPath, paint);

    const domePath = Skia.Path.Make();
    domePath.addArc({ x: -radius * 0.45, y: -radius * 0.65, width: radius * 0.9, height: radius * 0.9 }, 180, 180);
    canvas.drawPath(domePath, paint);

    canvas.restore();
  }
};

/**
 * Procedural detailed jagged Asteroid Shape Drawer for React Native Skia.
 * Supports Concept Pack parametric enemy geometry override if available in active Theme.
 */
export const drawSkiaAsteroidsAsteroid: ShapeDrawer<SkCanvas, AsteroidsComponentRegistry> = {
  draw(canvas, world, entity) {
    const setup = resolveAsteroidDrawSetup(world, getVisibleSkiaRender(world, entity), entity);
    if (!setup) return;

    const { render, radius, customGeom } = setup;

    canvas.save();

    const { opacity, colorStr, paint } = setupAsteroidStrokePaint(render, resolveThemeColorWithFallback(world, colors.pink, "asteroid", "enemy"), 2);

    if (customGeom) {
      const adapter = new SkiaDrawAdapter(canvas);
      drawFromGeometryProfileAdapter(adapter, customGeom, {
        size: radius * 2,
        baseColor: colorStr,
        globalAlpha: opacity,
      });
      canvas.restore();
      return;
    }

    let astPath = cachedAsteroidPaths.get(render);
    if (!astPath) {
      const createdPath = Skia.Path.Make();
      const points = computeAsteroidSilhouette(entity, radius, 11);

      for (let i = 0; i < points.length; i++) {
        if (i === 0) {
          createdPath.moveTo(points[i].x, points[i].y);
        } else {
          createdPath.lineTo(points[i].x, points[i].y);
        }
      }
      createdPath.close();
      cachedAsteroidPaths.set(render, createdPath);
      astPath = createdPath;
    }

    if (astPath) {
      canvas.drawPath(astPath, paint);
    }

    canvas.restore();
  }
};

/**
 * Glowing laser bullet shape drawer for React Native Skia.
 * Supports Concept Pack parametric projectile geometry override if available in active Theme.
 */
export const drawSkiaAsteroidsBullet: ShapeDrawer<SkCanvas, AsteroidsComponentRegistry> = {
  draw(canvas, world, entity) {
    const render = getVisibleSkiaRender(world, entity);
    if (!render) return;

    const theme = world.getResource<Theme>(THEME_RESOURCE_KEY);
    const customGeom = theme?.visualTheme?.shapeTokens?.projectileGeometry;

    const size = render.size || 2;
    const colorStr = render.color || resolveThemeColorWithFallback(world, colors.green, "bullet", "player-bullet");

    canvas.save();

    if (customGeom) {
      const adapter = new SkiaDrawAdapter(canvas);
      drawFromGeometryProfileAdapter(adapter, customGeom, {
        size: size * 4,
        baseColor: colorStr,
      });
      canvas.restore();
      return;
    }

    const length = size * 4;

    const paint = getPaint();
    paint.reset();
    paint.setAntiAlias(true);
    paint.setStyle(Skia.PaintStyle.Stroke);
    paint.setStrokeCap(Skia.StrokeCap.Round);

    paint.setColor(Skia.Color(colorStr));
    paint.setStrokeWidth(3);
    canvas.drawLine(-length / 2, 0, length / 2, 0, paint);

    paint.setColor(Skia.Color(resolveThemeColorWithFallback(world, colors.white, "bulletCore", "bullet")));
    paint.setStrokeWidth(1);
    canvas.drawLine(-length / 2, 0, length / 2, 0, paint);

    canvas.restore();
  }
};
