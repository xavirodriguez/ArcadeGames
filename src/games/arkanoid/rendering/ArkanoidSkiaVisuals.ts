/**
 * FINAL Skia drawers — parity with Canvas Module B+C (Imp. 9–20).
 */
import { ShapeDrawer, EffectDrawer } from "@tiny-aster/core";
import { ArkanoidComponentRegistry } from "../types/ArkanoidTypes";
import type { AmbientVFXResource } from "../types/ArkanoidVFXTypes";
import { colors } from "../../../theme/colors";
import { computeNeonPulse } from "../../shared/rendering/ProceduralShapeUtils";
import { drawGlowOrbSkia, drawSkiaBackgroundGrid } from "../../shared/rendering/SkiaNeonUtils";
import { Skia, getPaint, type SkCanvas } from "../../shared/rendering/SkiaContext";
import {
  getVisibleSkiaRender,
  drawSkiaFilledRoundRect,
  fillSkiaPaint,
} from "../../shared/rendering/renderingUtils";
import {
  resolveArkanoidBallContext,
  resolveArkanoidPaddleContext,
  resolveArkanoidBrickContext,
} from "./ArkanoidRenderUtils";

const ARENA_PAD = 8;

export const drawSkiaArkanoidBall: ShapeDrawer<SkCanvas, ArkanoidComponentRegistry> = {
  draw(canvas, world, entity) {
    const ballCtx = resolveArkanoidBallContext(world, entity);
    if (!ballCtx) return;

    const transform = world.getComponent(entity, "Transform");
    const trail = world.getComponent(entity, "BallTrail");
    if (trail && trail.count > 0 && transform && Skia) {
      const paint = getPaint();
      const n = trail.count;
      const max = trail.maxLength;
      const head = (trail.writeIndex - 1 + max) % max;
      for (let i = 0; i < n; i++) {
        const idx = (head - i + max) % max;
        const p = trail.history[idx];
        const t = 1 - i / n;
        fillSkiaPaint(paint, "fill", ballCtx.color);
        paint.setAlphaf?.(t * 0.45);
        canvas.drawCircle(p.x - transform.x, p.y - transform.y, ballCtx.size * t * 0.85, paint);
      }
      paint.setAlphaf?.(1);
    }

    const ball = world.getComponent(entity, "Ball");
    if (ball?.isAttached && Skia) {
      const paint = getPaint();
      fillSkiaPaint(paint, "stroke", "rgba(0,243,255,0.4)", 1.5);
      paint.setPathEffect?.(Skia.PathEffect?.MakeDash?.([6, 6], 0) ?? null);
      canvas.drawLine(0, 0, 40, -110, paint);
      paint.setPathEffect?.(null);
    }

    const paint = getPaint();
    drawGlowOrbSkia(canvas, paint, ballCtx.size, ballCtx.color, 0.4, 2.0);
  },
};

export const drawSkiaArkanoidPaddle: ShapeDrawer<SkCanvas, ArkanoidComponentRegistry> = {
  draw(canvas, world, entity) {
    const paddleCtx = resolveArkanoidPaddleContext(world, entity);
    if (!paddleCtx) return;

    const { w, h, primaryColor } = paddleCtx;
    const paint = getPaint();
    const radius = h / 2;

    canvas.save();

    const pulseFactor = computeNeonPulse(world.tick);
    const pw = w * pulseFactor;
    const ph = h;

    fillSkiaPaint(paint, "stroke", primaryColor, 2.0);
    canvas.drawRRect(
      Skia.RRectXY(Skia.XYWHRect(-pw / 2, -ph / 2, pw, ph), radius, radius),
      paint
    );

    fillSkiaPaint(paint, "fill", colors.white);
    const coreW = w * 0.6;
    const coreH = h * 0.5;
    canvas.drawRRect(
      Skia.RRectXY(Skia.XYWHRect(-coreW / 2, -coreH / 2, coreW, coreH), 2, 2),
      paint
    );

    fillSkiaPaint(paint, "fill", "rgba(255,255,255,0.35)");
    canvas.drawRRect(
      Skia.RRectXY(Skia.XYWHRect(-w / 2, -h / 2, w, h * 0.35), radius, radius),
      paint
    );

    const refl = world.getComponent(entity, "PaddleReflection");
    if (refl && refl.intensity > 0.01) {
      const rx = refl.hitOffsetX * (w / 2);
      fillSkiaPaint(paint, "fill", `rgba(255,255,255,${0.55 * refl.intensity})`);
      canvas.drawCircle(rx, -h / 4, w * 0.18, paint);
    }

    canvas.restore();
  },
};

export const drawSkiaArkanoidCapsule: ShapeDrawer<SkCanvas, ArkanoidComponentRegistry> = {
  draw(canvas, world, entity) {
    const render = getVisibleSkiaRender(world, entity);
    if (!render) return;

    const capsuleColor = render.color || colors.cyan;
    drawSkiaFilledRoundRect(canvas, 24, 14, capsuleColor, 7, 7);
  },
};

export const drawSkiaArkanoidBrick: ShapeDrawer<SkCanvas, ArkanoidComponentRegistry> = {
  draw(canvas, world, entity) {
    const brickCtx = resolveArkanoidBrickContext(world, entity);
    if (!brickCtx) return;

    const { w, h, brickColor } = brickCtx;
    const paint = getPaint();

    const pulse = 0.85 + 0.15 * (0.5 + 0.5 * Math.sin(world.tick * 0.08));
    drawSkiaFilledRoundRect(canvas, w, h, brickColor, 3, 3);

    fillSkiaPaint(paint, "fill", `rgba(255,255,255,${0.3 * pulse})`);
    canvas.drawRect(Skia.XYWHRect(-w / 2 + 1, -h / 2 + 1, w - 2, 2), paint);
    canvas.drawRect(Skia.XYWHRect(-w / 2 + 1, -h / 2 + 1, 2, h - 2), paint);
    fillSkiaPaint(paint, "fill", "rgba(0,0,0,0.4)");
    canvas.drawRect(Skia.XYWHRect(-w / 2 + 1, h / 2 - 3, w - 2, 2), paint);
    canvas.drawRect(Skia.XYWHRect(w / 2 - 3, -h / 2 + 1, 2, h - 2), paint);

    fillSkiaPaint(paint, "stroke", "rgba(0,0,0,0.25)", 1);
    const seed = entity * 7;
    for (let i = 0; i < 3; i++) {
      const y = -h / 2 + 4 + ((seed + i * 13) % Math.max(1, h - 8));
      const len = (seed * (i + 3)) % Math.max(1, w - 16);
      canvas.drawLine(-w / 2 + 4, y, -w / 2 + 4 + len, y, paint);
    }
  },
};

export const drawSkiaArkanoidBackground: EffectDrawer<SkCanvas, ArkanoidComponentRegistry> = {
  draw(canvas, world) {
    if (!Skia) return;
    const config = world.getResource<{ worldWidth?: number; worldHeight?: number }>("GameConfig");
    const width = config?.worldWidth ?? 800;
    const height = config?.worldHeight ?? 600;
    const paint = getPaint();

    drawSkiaBackgroundGrid(canvas, paint, width, height, world.tick, 50, 0.12, colors.border);

    fillSkiaPaint(paint, "stroke", "rgba(0,243,255,0.06)", 1);
    for (let y = 24; y < height; y += 72) {
      canvas.drawLine(0, y, width * 0.4, y, paint);
      canvas.drawLine(width * 0.4, y, width * 0.4 + 12, y + 8, paint);
    }

    fillSkiaPaint(paint, "fill", "rgba(0, 20, 40, 0.35)");
    canvas.drawRect(Skia.XYWHRect(0, 0, width, 16), paint);
    canvas.drawRect(Skia.XYWHRect(0, height - 16, width, 16), paint);
    canvas.drawRect(Skia.XYWHRect(0, 0, 16, height), paint);
    canvas.drawRect(Skia.XYWHRect(width - 16, 0, 16, height), paint);

    fillSkiaPaint(paint, "stroke", colors.cyan, 2);
    canvas.drawRect(
      Skia.XYWHRect(ARENA_PAD, ARENA_PAD, width - ARENA_PAD * 2, height - ARENA_PAD * 2),
      paint
    );

    const vfx = world.getResource<AmbientVFXResource>("AmbientVFX");
    if (vfx?.dust?.length) {
      let bx = -9999;
      let by = -9999;
      let px = -9999;
      let py = -9999;
      const balls = world.query("Ball", "Transform");
      if (balls[0] !== undefined) {
        const t = world.getComponent(balls[0], "Transform");
        if (t) {
          bx = t.x;
          by = t.y;
        }
      }
      const paddles = world.query("Paddle", "Transform");
      if (paddles[0] !== undefined) {
        const t = world.getComponent(paddles[0], "Transform");
        if (t) {
          px = t.x;
          py = t.y;
        }
      }
      for (let i = 0; i < vfx.dust.length; i++) {
        const p = vfx.dust[i];
        const dBall = Math.hypot(p.x - bx, p.y - by);
        const dPad = Math.hypot(p.x - px, p.y - py);
        const glow = Math.max(0, 1 - Math.min(dBall, dPad) / 120);
        const flicker = 0.35 + 0.25 * Math.sin(world.tick * 0.05 + p.phase);
        fillSkiaPaint(paint, "fill", colors.cyan);
        paint.setAlphaf?.(Math.min(1, flicker + glow * 0.5));
        canvas.drawCircle(p.x, p.y, p.radius * (1 + glow), paint);
      }
      paint.setAlphaf?.(1);
    }
  },
};
