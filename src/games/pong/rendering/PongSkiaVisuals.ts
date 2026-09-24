import { ShapeDrawer, EffectDrawer } from "@tiny-aster/core";
import { PongComponentRegistry } from "../types";
import { PongConfig } from "../types/PongConfigSchema";
import { colors } from "../../../theme/colors";
import { drawNeonShapeSkia, SkiaMotionTrail, drawSkiaBackgroundGrid } from "../../shared/rendering/SkiaNeonUtils";
import { Skia, getPaint } from "../../shared/rendering/SkiaContext";
import { resolvePongBallContext, resolvePongPaddleContext } from "./PongRenderUtils";

export { TrailPoint } from "../../shared/rendering/CanvasNeonUtils";
export { SkiaMotionTrail };

const ballSkiaMotionTrail = new SkiaMotionTrail(30);

/**
 * Upgraded, high-fidelity Skia ball shape drawer.
 * @public
 */
export const drawSkiaPongBall: ShapeDrawer<any, PongComponentRegistry> = {
  draw(canvas, world, entity) {
    const ballCtx = resolvePongBallContext(world, entity);
    if (!ballCtx) return;

    const { size, x, y, spin, swirlRotation, trailLength, trailColor, trailColorInner, ballColor } = ballCtx;

    const paint = getPaint();

    ballSkiaMotionTrail.update(entity, x, y, 4);
    ballSkiaMotionTrail.drawSkia(canvas, paint, entity, x, y, trailLength, size, trailColor, trailColorInner);

    canvas.save();

    canvas.rotate((swirlRotation * 180) / Math.PI, 0, 0);

    paint.reset();
    paint.setAntiAlias(true);
    paint.setStyle(Skia.PaintStyle.Stroke);
    paint.setColor(Skia.Color(ballColor));
    paint.setStrokeWidth(2.0);
    canvas.drawCircle(0, 0, size, paint);

    paint.setColor(Skia.Color(colors.white));
    paint.setStrokeWidth(1.5);
    const swirlPath = Skia.Path.Make();
    swirlPath.moveTo(0, -size);
    swirlPath.quadTo(size * spin * 1.5, 0, 0, size);
    swirlPath.moveTo(-size, 0);
    swirlPath.quadTo(0, size * spin * 1.5, size, 0);
    canvas.drawPath(swirlPath, paint);

    paint.reset();
    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setColor(Skia.Color(colors.white));
    canvas.drawCircle(0, 0, size * 0.4, paint);

    canvas.restore();
  }
};

/**
 * Upgraded, high-fidelity Skia paddle shape drawer.
 * @public
 */
export const drawSkiaPongPaddle: ShapeDrawer<any, PongComponentRegistry> = {
  draw(canvas, world, entity) {
    const paddleCtx = resolvePongPaddleContext(world, entity);
    if (!paddleCtx) return;

    const { w, h, color, glowAlphaColor } = paddleCtx;

    const paint = getPaint();

    drawNeonShapeSkia(
      canvas,
      paint,
      world.tick,
      color,
      glowAlphaColor,
      (c, p, widthScale, heightScale) => {
        const pw = w * widthScale;
        const ph = h * heightScale;
        c.drawRoundRect(Skia.RRectXY(Skia.XYWHRect(-pw / 2, -ph / 2, pw, ph), 4, 4), p);
      },
      (c, p) => {
        const coreW = w * 0.4;
        const coreH = h * 0.9;
        c.drawRoundRect(Skia.RRectXY(Skia.XYWHRect(-coreW / 2, -coreH / 2, coreW, coreH), 2, 2), p);
      }
    );
  }
};

/**
 * Procedural retro space-grid background effect drawer for React Native Skia.
 * @public
 */
export const drawSkiaPongBackground: EffectDrawer<any, PongComponentRegistry> = {
  draw(canvas, world) {
    if (!Skia) return;
    const config = world.getResource<PongConfig>("GameConfig") || { worldWidth: 800, worldHeight: 600 };
    const width = config.worldWidth;
    const height = config.worldHeight;

    const paint = getPaint();

    drawSkiaBackgroundGrid(canvas, paint, width, height, world.tick, 40, 0.3, "rgba(0, 240, 255, 0.04)");

    canvas.save();
    paint.reset();
    paint.setStyle(Skia.PaintStyle.Stroke);
    paint.setColor(Skia.Color("rgba(255, 0, 85, 0.3)"));
    paint.setStrokeWidth(3.0);

    const dashLength = 10;
    const dashGap = 15;
    for (let dy = 0; dy < height; dy += (dashLength + dashGap)) {
      canvas.drawLine(width / 2, dy, width / 2, Math.min(height, dy + dashLength), paint);
    }

    paint.setColor(Skia.Color("rgba(255, 255, 255, 0.8)"));
    paint.setStrokeWidth(1.5);
    for (let dy = 0; dy < height; dy += (dashLength + dashGap)) {
      canvas.drawLine(width / 2, dy, width / 2, Math.min(height, dy + dashLength), paint);
    }
    canvas.restore();

    const state = world.getSingleton("PongState");
    if (state && state.shieldPulseRemaining !== undefined && state.shieldPulseRemaining > 0) {
      canvas.save();
      paint.reset();
      paint.setStyle(Skia.PaintStyle.Stroke);
      paint.setColor(Skia.Color(colors.cyan));
      paint.setStrokeWidth(4.0);
      paint.setAlphaf((0.4 + 0.3 * Math.sin(world.tick / 5)) * 0.6);

      const shieldPath = Skia.Path.Make();
      const rect = Skia.XYWHRect(-height * 0.8, -height * 0.3, height * 1.6, height * 1.6);
      shieldPath.addArc(rect, -60, 120);
      canvas.drawPath(shieldPath, paint);
      canvas.restore();
    }

    if (state && state.scoreFreezeRemaining !== undefined && state.scoreFreezeRemaining > 0) {
      canvas.save();
      const neonColor = state.lastScorer === "p1" ? colors.pink : colors.cyan;

      const pulseFactor = 1.0 + 0.1 * Math.sin(world.tick / 4);
      const gw = 200 * pulseFactor;
      const gh = 60 * pulseFactor;

      paint.reset();
      paint.setStyle(Skia.PaintStyle.Stroke);
      paint.setColor(Skia.Color(neonColor));
      paint.setStrokeWidth(3.0);
      canvas.drawRoundRect(Skia.RRectXY(Skia.XYWHRect(width / 2 - gw / 2, height / 2 - gh / 2, gw, gh), 8, 8), paint);

      paint.setStyle(Skia.PaintStyle.Fill);
      paint.setColor(Skia.Color(neonColor));
      paint.setAlphaf(0.12);
      canvas.drawRoundRect(Skia.RRectXY(Skia.XYWHRect(width / 2 - gw / 2, height / 2 - gh / 2, gw, gh), 8, 8), paint);

      paint.reset();
      paint.setStyle(Skia.PaintStyle.Fill);
      paint.setColor(Skia.Color(colors.white));
      paint.setAlphaf(0.8);
      canvas.drawCircle(width / 2 - gw * 0.25, height / 2, 4, paint);
      canvas.drawCircle(width / 2, height / 2, 4, paint);
      canvas.drawCircle(width / 2 + gw * 0.25, height / 2, 4, paint);

      canvas.restore();
    }

    paint.reset();
    paint.setColor(Skia.Color("rgba(0, 0, 0, 0.4)"));
    canvas.drawRect(Skia.XYWHRect(0, 0, width, 12), paint);
    canvas.drawRect(Skia.XYWHRect(0, height - 12, width, 12), paint);
    canvas.drawRect(Skia.XYWHRect(0, 0, 12, height), paint);
    canvas.drawRect(Skia.XYWHRect(width - 12, 0, 12, height), paint);
  }
};
