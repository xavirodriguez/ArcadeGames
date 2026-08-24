import { ShapeDrawer, World, ShapeType, CircleShape, ColliderComponent, RenderComponent } from "@tiny-aster/core";
import { AsteroidsComponentRegistry } from "../types/AsteroidRegistry";
import { colors } from "../../../theme/colors";
import { computeAsteroidSilhouette, computeThrustFlame } from "../../shared/rendering/ProceduralShapeUtils";

let Skia: any = null;
try {
  Skia = require("@shopify/react-native-skia").Skia;
} catch {}

let cachedPaint: any = null;
function getPaint(): any {
  if (!cachedPaint && Skia) {
    cachedPaint = Skia.Paint();
  }
  return cachedPaint;
}

// Memory-safe WeakMaps keyed by render components for zero-allocation Skia Path caching
const cachedShipPaths = new WeakMap<any, { ship: any; cockpit: any }>();
const cachedAsteroidPaths = new WeakMap<any, any>();

/**
 * Procedural player ship shape drawer for React Native Skia.
 * Renders a glowing, sleek retro spacecraft with animated thruster plumes.
 */
export const drawSkiaAsteroidsPlayerShip: ShapeDrawer<any, AsteroidsComponentRegistry> = {
  draw(canvas, world, entity) {
    if (!Skia) return;
    const render = world.getComponent(entity, "Render");
    if (!render) return;

    const size = render.size || 15;
    let colorStr = render.color || colors.cyan; // Glowing cyan default

    canvas.save();

    let opacity = 1.0;

    // Hit Flash Transparency Pulse
    if (render.hitFlashFrames && render.hitFlashFrames > 0) {
      if ((render.hitFlashFrames >> 1) % 2 === 0) {
        opacity = 0.3;
      }
      colorStr = colors.white;
    }

    // Invulnerability Pulse
    const hasInvulnerable = world.hasComponent(entity, "Invulnerable" as any);
    if (hasInvulnerable) {
      const inv = world.getComponent(entity, "Invulnerable" as any) as { remaining: number } | undefined;
      if (inv && inv.remaining > 0) {
        const pulse = Math.floor(inv.remaining * 10) % 2;
        if (pulse === 0) {
          opacity = 0.3;
        }
      }
    }

    const paint = getPaint();
    paint.reset();
    paint.setAntiAlias(true);

    // Draw Thrust Flame if thrust is active (ephemeral flame can use a pooled/reusable path or direct line drawing)
    const input = world.getComponent(entity, "Input");
    if (input && input.actions && input.actions["thrust"]) {
      const { flameLen, sparks } = computeThrustFlame(size, world.renderRandom);

      paint.setStyle(Skia.PaintStyle.Fill);
      paint.setColor(Skia.Color(colors.gold)); // Neon yellow core
      paint.setAlphaf(opacity * 0.7);

      const flamePath = Skia.Path.Make();
      flamePath.moveTo(-size * 0.4, -size * 0.4);
      flamePath.lineTo(-(size * 0.4 + flameLen), 0);
      flamePath.lineTo(-size * 0.4, size * 0.4);
      flamePath.close();
      canvas.drawPath(flamePath, paint);

      paint.setStyle(Skia.PaintStyle.Stroke);
      paint.setColor(Skia.Color(colors.orangeDark)); // Neon orange outline
      paint.setStrokeWidth(2);
      paint.setAlphaf(opacity);
      canvas.drawPath(flamePath, paint);

      // Lingering Hot Plasma Exhaust Sparks
      paint.setStyle(Skia.PaintStyle.Fill);
      paint.setColor(Skia.Color("#ffffff"));
      paint.setAlphaf(opacity);
      for (let i = 0; i < sparks.length; i++) {
        const { sparkOffset, sparkY, sparkRadius } = sparks[i];
        canvas.drawCircle(-(size * 0.4 + sparkOffset), sparkY, sparkRadius, paint);
      }
    }

    // Retrieve or pre-build static ship paths
    let shipGeom = cachedShipPaths.get(render);
    if (!shipGeom) {
      const shipPath = Skia.Path.Make();
      shipPath.moveTo(size, 0); // Nose pointing RIGHT (+X)
      shipPath.lineTo(-size * 0.7, size * 0.7); // Right back
      shipPath.lineTo(-size * 0.5, size * 0.3); // Center back indent
      shipPath.lineTo(-size * 0.5, -size * 0.3); // Center back indent
      shipPath.lineTo(-size * 0.7, -size * 0.7); // Left back
      shipPath.close();

      const cockpitPath = Skia.Path.Make();
      cockpitPath.moveTo(size * 0.3, 0);
      cockpitPath.lineTo(-size * 0.3, size * 0.3);
      cockpitPath.lineTo(-size * 0.3, -size * 0.3);
      cockpitPath.close();

      shipGeom = { ship: shipPath, cockpit: cockpitPath };
      cachedShipPaths.set(render, shipGeom);
    }

    // Draw Main Ship Body
    paint.setStyle(Skia.PaintStyle.Stroke);
    paint.setColor(Skia.Color(colorStr));
    paint.setStrokeWidth(2);
    paint.setAlphaf(opacity);
    canvas.drawPath(shipGeom.ship, paint);

    // Inner detail (cockpit line)
    canvas.drawPath(shipGeom.cockpit, paint);

    canvas.restore();
  }
};

/**
 * Procedural detailed jagged Asteroid Shape Drawer for React Native Skia.
 * Caches paths deterministically inside a WeakMap to eliminate GC allocations per frame.
 */
export const drawSkiaAsteroidsAsteroid: ShapeDrawer<any, AsteroidsComponentRegistry> = {
  draw(canvas, world, entity) {
    if (!Skia) return;
    const render = world.getComponent(entity, "Render");
    const collider = world.getComponent(entity, "Collider");
    if (!render) return;

    let radius = 25;
    if (collider && collider.enabled && collider.shape.type === ShapeType.Circle) {
      radius = (collider.shape as CircleShape).radius;
    } else if (render.size) {
      radius = render.size / 2;
    }

    let colorStr = render.color || colors.pink; // Neon pink default
    canvas.save();

    let opacity = 1.0;
    if (render.hitFlashFrames && render.hitFlashFrames > 0) {
      if ((render.hitFlashFrames >> 1) % 2 === 0) {
        opacity = 0.3;
      }
      colorStr = colors.white;
    }

    const paint = getPaint();
    paint.reset();
    paint.setAntiAlias(true);
    paint.setStyle(Skia.PaintStyle.Stroke);
    paint.setColor(Skia.Color(colorStr));
    paint.setStrokeWidth(2);
    paint.setAlphaf(opacity);

    // Retrieve or generate path once per asteroid lifecycle
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
 * Creates a high-fidelity bullet with a bright white core.
 */
export const drawSkiaAsteroidsBullet: ShapeDrawer<any, AsteroidsComponentRegistry> = {
  draw(canvas, world, entity) {
    if (!Skia) return;
    const render = world.getComponent(entity, "Render");
    if (!render) return;

    const size = render.size || 2;
    const colorStr = render.color || colors.green; // Glowing laser green
    const length = size * 4;

    canvas.save();

    const paint = getPaint();
    paint.reset();
    paint.setAntiAlias(true);
    paint.setStyle(Skia.PaintStyle.Stroke);
    paint.setStrokeCap(Skia.StrokeCap.Round);

    // Laser glow line (aligned to +X direction/horizontally)
    paint.setColor(Skia.Color(colorStr));
    paint.setStrokeWidth(3);
    canvas.drawLine(-length / 2, 0, length / 2, 0, paint);

    // White core line for brightness
    paint.setColor(Skia.Color(colors.white));
    paint.setStrokeWidth(1);
    canvas.drawLine(-length / 2, 0, length / 2, 0, paint);

    canvas.restore();
  }
};
