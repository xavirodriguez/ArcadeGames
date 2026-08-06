import { ShapeDrawer } from "@tiny-aster/core";
import { GeometryWarsComponentRegistry } from "../types/GeometryWarsRegistry";

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

/**
 * Skia shape drawer for the player ship.
 * @public
 */
export const drawSkiaPlayerShip: ShapeDrawer<any, GeometryWarsComponentRegistry> = {
  draw(canvas, world, entity) {
    if (!Skia) return;

    const render = world.getComponent(entity, "Render");
    if (!render || !render.visible) return;

    const size = render.size ?? 16;
    const color = render.color ?? "#00f0ff";

    const paint = getPaint();
    canvas.save();

    // 1. Draw glowing neon stroke outline using a Skia path
    paint.reset();
    paint.setAntiAlias(true);
    paint.setStyle(Skia.PaintStyle.Stroke);
    paint.setStrokeWidth(2.0);
    paint.setColor(Skia.Color(color));

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
export const drawSkiaParticle: ShapeDrawer<any, GeometryWarsComponentRegistry> = {
  draw(canvas, world, entity) {
    if (!Skia) return;

    const render = world.getComponent(entity, "Render");
    if (!render || !render.visible) return;

    const size = render.size ?? 3;
    const color = render.color ?? "#ffffff";

    const paint = getPaint();
    canvas.save();

    paint.reset();
    paint.setAntiAlias(true);
    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color(color));

    canvas.drawRect(Skia.XYWHRect(-size / 2, -size / 2, size, size), paint);

    canvas.restore();
  }
};

/**
 * Skia shape drawer for the Chaser enemy.
 * @public
 */
export const drawSkiaChaser: ShapeDrawer<any, GeometryWarsComponentRegistry> = {
  draw(canvas, world, entity) {
    if (!Skia) return;

    const render = world.getComponent(entity, "Render");
    if (!render || !render.visible) return;

    const size = render.size ?? 14;
    const color = render.color ?? "#ff00ff";

    const paint = getPaint();
    canvas.save();

    paint.reset();
    paint.setAntiAlias(true);
    paint.setStyle(Skia.PaintStyle.Stroke);
    paint.setStrokeWidth(2.0);
    paint.setColor(Skia.Color(color));

    const path = Skia.Path.Make();
    path.moveTo(0, -size);
    path.lineTo(size, 0);
    path.lineTo(0, size);
    path.lineTo(-size, 0);
    path.close();

    canvas.drawPath(path, paint);

    canvas.restore();
  }
};

/**
 * Skia shape drawer for the Evader enemy.
 * @public
 */
export const drawSkiaEvader: ShapeDrawer<any, GeometryWarsComponentRegistry> = {
  draw(canvas, world, entity) {
    if (!Skia) return;

    const render = world.getComponent(entity, "Render");
    if (!render || !render.visible) return;

    const size = render.size ?? 14;
    const color = render.color ?? "#ffaa00";

    const paint = getPaint();
    canvas.save();

    paint.reset();
    paint.setAntiAlias(true);
    paint.setStyle(Skia.PaintStyle.Stroke);
    paint.setStrokeWidth(2.0);
    paint.setColor(Skia.Color(color));

    const path = Skia.Path.Make();
    path.moveTo(size, 0);
    path.lineTo(-size / 2, -size / 2);
    path.lineTo(-size / 2, size / 2);
    path.close();

    canvas.drawPath(path, paint);

    canvas.restore();
  }
};

/**
 * Skia shape drawer for the Grunt enemy.
 * @public
 */
export const drawSkiaGrunt: ShapeDrawer<any, GeometryWarsComponentRegistry> = {
  draw(canvas, world, entity) {
    if (!Skia) return;

    const render = world.getComponent(entity, "Render");
    if (!render || !render.visible) return;

    const size = render.size ?? 10;
    const color = render.color ?? "#00ffff";

    const paint = getPaint();
    canvas.save();

    paint.reset();
    paint.setAntiAlias(true);
    paint.setStyle(Skia.PaintStyle.Stroke);
    paint.setStrokeWidth(1.5);
    paint.setColor(Skia.Color(color));

    const path = Skia.Path.Make();
    path.moveTo(size, 0);
    path.lineTo(-size, -size * 0.7);
    path.lineTo(-size, size * 0.7);
    path.close();

    canvas.drawPath(path, paint);

    canvas.restore();
  }
};

/**
 * Skia shape drawer for the bullets.
 * @public
 */
export const drawSkiaBullet: ShapeDrawer<any, GeometryWarsComponentRegistry> = {
  draw(canvas, world, entity) {
    if (!Skia) return;

    const render = world.getComponent(entity, "Render");
    if (!render || !render.visible) return;

    const size = render.size ?? 4;
    const color = render.color ?? "#ffff00";

    const paint = getPaint();
    canvas.save();

    paint.reset();
    paint.setAntiAlias(true);
    paint.setStyle(Skia.PaintStyle.Stroke);
    paint.setStrokeWidth(1.5);
    paint.setColor(Skia.Color(color));

    canvas.drawLine(-size, 0, size, 0, paint);

    canvas.restore();
  }
};
