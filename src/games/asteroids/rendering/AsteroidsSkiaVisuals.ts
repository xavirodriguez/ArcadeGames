import { EffectDrawer, ShapeDrawer, World, RenderComponent, SHIP_FORWARD_AXIS, THEME_RESOURCE_KEY, Theme } from "@tiny-aster/core";
import { AsteroidsComponentRegistry } from "../types/AsteroidRegistry";
import { colors } from "../../../theme/colors";
import { computeAsteroidSilhouette, computeThrustFlame, computeMotionSecondaryEffect } from "../../shared/rendering/ProceduralShapeUtils";
import { resolveHitFlash, resolveInvulnerabilityPulse, resolveAsteroidHitFlash } from "../../shared/rendering/RenderUtils";
import { drawSkiaAsteroidsMissionHUD } from "./AsteroidsSkiaMissionHUD";
import { SkiaDrawAdapter } from "../../shared/rendering/DrawAdapter";
import { drawFromGeometryProfileAdapter } from "../../shared/rendering/GenericEntityDrawer";

import { Skia, getPaint } from "../../shared/rendering/SkiaContext";
import { getVisibleSkiaRender } from "../../shared/rendering/renderingUtils";
import { resolveAsteroidRadius } from "./AsteroidsVisualHelpers";

export { drawSkiaAsteroidsMissionHUD };

// Memory-safe WeakMaps keyed by render components for zero-allocation Skia Path caching
const cachedShipPaths = new WeakMap<any, { ship: any; cockpit: any }>();
const cachedAsteroidPaths = new WeakMap<any, any>();

function resolveAsteroidOpacityAndColor(render: RenderComponent, defaultColor: string): { opacity: number; colorStr: string } {
  return resolveAsteroidHitFlash(render, defaultColor);
}

function setupAsteroidStrokePaint(
  render: RenderComponent,
  defaultColor: string,
  strokeWidth = 2
): { opacity: number; colorStr: string; paint: any } {
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
export const drawSkiaAsteroidsPlayerShip: ShapeDrawer<any, AsteroidsComponentRegistry> = {
  draw(canvas, world, entity) {
    const render = getVisibleSkiaRender(world, entity);
    if (!render) return;

    const theme = world.getResource<Theme>(THEME_RESOURCE_KEY);
    const customGeom = theme?.visualTheme?.shapeTokens?.playerGeometry;

    const size = render.size || 15;
    const tick = Math.floor((world.tick * 5) / 12);

    canvas.save();

    let { opacity, colorStr } = resolveAsteroidOpacityAndColor(render, colors.cyan);

    // Invulnerability Pulse
    if (world.hasComponent(entity, "Invulnerable")) {
      const inv = world.getComponent(entity, "Invulnerable");
      const invState = resolveInvulnerabilityPulse(inv?.remaining, opacity, { mode: "time" });
      if (invState.isInvulnerable) {
        opacity = invState.opacity;
      }
    }

    const input = world.getComponent(entity, "Input");
    const isThrusting = Boolean(input && input.actions && input.actions["thrust"]);

    if (customGeom) {
      const motionEffect = customGeom.motionEffect || "flame";
      if (isThrusting && motionEffect !== "none") {
        const motionData = computeMotionSecondaryEffect(motionEffect, size, tick, world.renderRandom);
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

      paint.setStyle(Skia.PaintStyle.Fill);
      paint.setColor(Skia.Color(colors.gold));
      paint.setAlphaf(opacity * 0.7);

      const flamePath = Skia.Path.Make();
      flamePath.moveTo(-size * 0.4, -size * 0.4);
      flamePath.lineTo(-(size * 0.4 + flameLen), 0);
      flamePath.lineTo(-size * 0.4, size * 0.4);
      flamePath.close();
      canvas.drawPath(flamePath, paint);

      paint.setStyle(Skia.PaintStyle.Stroke);
      paint.setColor(Skia.Color(colors.orangeDark));
      paint.setStrokeWidth(2);
      paint.setAlphaf(opacity);
      canvas.drawPath(flamePath, paint);

      paint.setStyle(Skia.PaintStyle.Fill);
      paint.setColor(Skia.Color("#ffffff"));
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
export const drawSkiaAsteroidsUfo: ShapeDrawer<any, AsteroidsComponentRegistry> = {
  draw(canvas, world, entity) {
    const render = getVisibleSkiaRender(world, entity);
    if (!render) return;

    const size = render.size || 36;
    const radius = size / 2;

    canvas.save();

    const { paint } = setupAsteroidStrokePaint(render, colors.cyan, 2);

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
export const drawSkiaAsteroidsAsteroid: ShapeDrawer<any, AsteroidsComponentRegistry> = {
  draw(canvas, world, entity) {
    const render = getVisibleSkiaRender(world, entity);
    const collider = world.getComponent(entity, "Collider");
    if (!render) return;

    const theme = world.getResource<Theme>(THEME_RESOURCE_KEY);
    const customGeom = theme?.visualTheme?.shapeTokens?.enemyGeometry;

    const radius = resolveAsteroidRadius(render, collider);

    canvas.save();

    const { opacity, colorStr, paint } = setupAsteroidStrokePaint(render, colors.pink, 2);

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
      astPath = Skia.Path.Make();
      const points = computeAsteroidSilhouette(entity, radius, 11);

      for (let i = 0; i < points.length; i++) {
        if (i === 0) {
          astPath.moveTo(points[i].x, points[i].y);
        } else {
          astPath.lineTo(points[i].x, points[i].y);
        }
      }
      astPath.close();
      cachedAsteroidPaths.set(render, astPath);
    }

    canvas.drawPath(astPath, paint);

    canvas.restore();
  }
};

/**
 * Glowing laser bullet shape drawer for React Native Skia.
 * Supports Concept Pack parametric projectile geometry override if available in active Theme.
 */
export const drawSkiaAsteroidsBullet: ShapeDrawer<any, AsteroidsComponentRegistry> = {
  draw(canvas, world, entity) {
    const render = getVisibleSkiaRender(world, entity);
    if (!render) return;

    const theme = world.getResource<Theme>(THEME_RESOURCE_KEY);
    const customGeom = theme?.visualTheme?.shapeTokens?.projectileGeometry;

    const size = render.size || 2;
    const colorStr = render.color || colors.green;

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

    paint.setColor(Skia.Color(colors.white));
    paint.setStrokeWidth(1);
    canvas.drawLine(-length / 2, 0, length / 2, 0, paint);

    canvas.restore();
  }
};
