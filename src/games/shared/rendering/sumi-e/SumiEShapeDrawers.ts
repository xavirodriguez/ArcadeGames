/**
 * SumiEShapeDrawers.ts
 * Lightweight Canvas + Skia drawers for sumi-e juice primitives.
 * Registered via registerSumiEVFX so juice.spawn("ink_splash") renders correctly.
 */

import type {
  World,
  CoreComponentRegistry,
  ShapeDrawer,
  Renderer,
  RenderContext,
  ComponentRegistry
} from "@tiny-aster/core";
import { Skia, getPaint } from "../SkiaContext";
import type { SkCanvas } from "../SkiaContext";
import { SUMI_E_PALETTE } from "./SumiEPalette";

function getRenderProps(world: World<CoreComponentRegistry>, entity: number) {
  const transform = world.getComponent(entity, "Transform");
  const render = world.getComponent(entity, "Render");
  const ttl = world.getComponent(entity, "TTL");
  if (!transform || !render) return null;

  const total = (ttl as { timeLeft?: number })?.timeLeft ?? 1;
  const remaining = (ttl as { remaining?: number })?.remaining ?? total;
  const progress = total > 0 ? 1 - remaining / total : 1;
  const alpha = Math.max(0, Math.min(1, remaining / Math.max(total, 0.001)));

  return {
    x: (transform as { x: number }).x,
    y: (transform as { y: number }).y,
    size: (render as { size?: number }).size ?? 20,
    color: (render as { color?: string }).color ?? SUMI_E_PALETTE.ink,
    text: (render as { text?: string }).text,
    progress,
    alpha: alpha * ((render as { opacity?: number }).opacity ?? 1)
  };
}

// ─── Canvas drawers ───────────────────────────────────────────────────────────

export const CanvasInkSplashDrawer: ShapeDrawer<CanvasRenderingContext2D, CoreComponentRegistry> = {
  draw(ctx, world, entity) {
    const p = getRenderProps(world, entity);
    if (!p || p.alpha < 0.02) return;

    const radius = p.size * (0.4 + p.progress * 1.6);
    ctx.save();
    ctx.globalAlpha = p.alpha * (1 - p.progress * 0.7);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    // Irregular ink blot (5 lobes)
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const r = radius * (0.7 + 0.35 * Math.sin(i * 2.7 + p.progress * 3));
      const px = p.x + Math.cos(a) * r;
      const py = p.y + Math.sin(a) * r;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
};

export const CanvasSealStampDrawer: ShapeDrawer<CanvasRenderingContext2D, CoreComponentRegistry> = {
  draw(ctx, world, entity) {
    const p = getRenderProps(world, entity);
    if (!p || p.alpha < 0.02) return;

    const s = p.size * (0.6 + Math.min(1, p.progress * 4) * 0.4);
    const rot = (1 - Math.min(1, p.progress * 5)) * 0.35;

    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(rot);
    ctx.globalAlpha = p.alpha;
    ctx.strokeStyle = p.color;
    ctx.fillStyle = p.color;
    ctx.lineWidth = 2;

    // Square seal frame
    ctx.strokeRect(-s / 2, -s / 2, s, s);
    // Inner mark
    ctx.globalAlpha = p.alpha * 0.85;
    ctx.fillRect(-s * 0.25, -s * 0.25, s * 0.5, s * 0.5);

    if (p.text) {
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = SUMI_E_PALETTE.paper;
      ctx.font = `bold ${Math.max(8, s * 0.45)}px serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(p.text.slice(0, 2), 0, 0);
    }
    ctx.restore();
  }
};

export const CanvasBrushStrokeDrawer: ShapeDrawer<CanvasRenderingContext2D, CoreComponentRegistry> = {
  draw(ctx, world, entity) {
    const p = getRenderProps(world, entity);
    if (!p || p.alpha < 0.02) return;

    const len = p.size * 2.2;
    ctx.save();
    ctx.globalAlpha = p.alpha * (1 - p.progress);
    ctx.strokeStyle = p.color;
    ctx.lineWidth = Math.max(1.5, p.size * 0.25 * (1 - p.progress * 0.5));
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(p.x - len * 0.5, p.y);
    // Slight curve
    ctx.quadraticCurveTo(p.x, p.y - p.size * 0.3, p.x + len * 0.5, p.y + p.size * 0.1);
    ctx.stroke();
    ctx.restore();
  }
};

export const CanvasWaterRippleDrawer: ShapeDrawer<CanvasRenderingContext2D, CoreComponentRegistry> = {
  draw(ctx, world, entity) {
    const p = getRenderProps(world, entity);
    if (!p || p.alpha < 0.02) return;

    const r = p.size * (0.3 + p.progress * 2);
    ctx.save();
    ctx.globalAlpha = p.alpha * (1 - p.progress);
    ctx.strokeStyle = p.color;
    ctx.lineWidth = Math.max(1, 3 * (1 - p.progress));
    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.stroke();
    if (p.progress > 0.25) {
      ctx.globalAlpha = p.alpha * (1 - p.progress) * 0.5;
      ctx.beginPath();
      ctx.arc(p.x, p.y, r * 0.55, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }
};

// Aliases for related primitives
export const CanvasInkBleedDrawer = CanvasInkSplashDrawer;
export const CanvasDryBrushTrailDrawer = CanvasBrushStrokeDrawer;
export const CanvasMistLayerDrawer = CanvasWaterRippleDrawer;
export const CanvasFloatingKanjiDrawer = CanvasSealStampDrawer;

// ─── Skia drawers ─────────────────────────────────────────────────────────────

function skiaDrawInkSplash(canvas: SkCanvas, world: World<CoreComponentRegistry>, entity: number): void {
  if (!Skia) return;
  const p = getRenderProps(world, entity);
  if (!p || p.alpha < 0.02) return;

  const paint = getPaint();
  if (!paint) return;

  const radius = p.size * (0.4 + p.progress * 1.6);
  paint.setColor(Skia.Color(p.color));
  paint.setAlphaf(p.alpha * (1 - p.progress * 0.7));

  const path = Skia.Path.Make();
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const r = radius * (0.7 + 0.35 * Math.sin(i * 2.7 + p.progress * 3));
    const px = p.x + Math.cos(a) * r;
    const py = p.y + Math.sin(a) * r;
    if (i === 0) path.moveTo(px, py);
    else path.lineTo(px, py);
  }
  path.close();
  canvas.drawPath(path, paint);
  paint.setAlphaf(1);
}

export const SkiaInkSplashDrawer: ShapeDrawer<SkCanvas, CoreComponentRegistry> = {
  draw(canvas, world, entity) {
    skiaDrawInkSplash(canvas, world, entity);
  }
};

export const SkiaSealStampDrawer: ShapeDrawer<SkCanvas, CoreComponentRegistry> = {
  draw(canvas, world, entity) {
    if (!Skia) return;
    const p = getRenderProps(world, entity);
    if (!p || p.alpha < 0.02) return;
    const paint = getPaint();
    if (!paint) return;

    const s = p.size * (0.6 + Math.min(1, p.progress * 4) * 0.4);
    paint.setColor(Skia.Color(p.color));
    paint.setAlphaf(p.alpha);
    paint.setStyle(Skia.PaintStyle.Stroke);
    paint.setStrokeWidth(2);
    canvas.drawRect(Skia.XYWHRect(p.x - s / 2, p.y - s / 2, s, s), paint);
    paint.setStyle(Skia.PaintStyle.Fill);
    paint.setAlphaf(p.alpha * 0.85);
    canvas.drawRect(Skia.XYWHRect(p.x - s * 0.25, p.y - s * 0.25, s * 0.5, s * 0.5), paint);
    paint.setAlphaf(1);
  }
};

export const SkiaBrushStrokeDrawer: ShapeDrawer<SkCanvas, CoreComponentRegistry> = {
  draw(canvas, world, entity) {
    if (!Skia) return;
    const p = getRenderProps(world, entity);
    if (!p || p.alpha < 0.02) return;
    const paint = getPaint();
    if (!paint) return;

    const len = p.size * 2.2;
    paint.setColor(Skia.Color(p.color));
    paint.setAlphaf(p.alpha * (1 - p.progress));
    paint.setStyle(Skia.PaintStyle.Stroke);
    paint.setStrokeWidth(Math.max(1.5, p.size * 0.25 * (1 - p.progress * 0.5)));
    paint.setStrokeCap(Skia.StrokeCap.Round);

    const path = Skia.Path.Make();
    path.moveTo(p.x - len * 0.5, p.y);
    path.quadTo(p.x, p.y - p.size * 0.3, p.x + len * 0.5, p.y + p.size * 0.1);
    canvas.drawPath(path, paint);
    paint.setAlphaf(1);
    paint.setStyle(Skia.PaintStyle.Fill);
  }
};

export const SkiaWaterRippleDrawer: ShapeDrawer<SkCanvas, CoreComponentRegistry> = {
  draw(canvas, world, entity) {
    if (!Skia) return;
    const p = getRenderProps(world, entity);
    if (!p || p.alpha < 0.02) return;
    const paint = getPaint();
    if (!paint) return;

    const r = p.size * (0.3 + p.progress * 2);
    paint.setColor(Skia.Color(p.color));
    paint.setAlphaf(p.alpha * (1 - p.progress));
    paint.setStyle(Skia.PaintStyle.Stroke);
    paint.setStrokeWidth(Math.max(1, 3 * (1 - p.progress)));
    canvas.drawCircle(p.x, p.y, r, paint);
    if (p.progress > 0.25) {
      paint.setAlphaf(p.alpha * (1 - p.progress) * 0.5);
      canvas.drawCircle(p.x, p.y, r * 0.55, paint);
    }
    paint.setAlphaf(1);
    paint.setStyle(Skia.PaintStyle.Fill);
  }
};

export const SkiaInkBleedDrawer = SkiaInkSplashDrawer;
export const SkiaDryBrushTrailDrawer = SkiaBrushStrokeDrawer;
export const SkiaMistLayerDrawer = SkiaWaterRippleDrawer;
export const SkiaFloatingKanjiDrawer = SkiaSealStampDrawer;

/**
 * Registers all sumi-e shape drawers on the given renderer.
 */
export function registerSumiEVFX(
  renderer: Renderer<CoreComponentRegistry, RenderContext>
): void {
  if (renderer.type === "canvas") {
    const map: Record<string, ShapeDrawer<CanvasRenderingContext2D, CoreComponentRegistry>> = {
      ink_splash: CanvasInkSplashDrawer,
      ink_bleed: CanvasInkBleedDrawer,
      brush_stroke: CanvasBrushStrokeDrawer,
      dry_brush_trail: CanvasDryBrushTrailDrawer,
      seal_stamp: CanvasSealStampDrawer,
      mist_layer: CanvasMistLayerDrawer,
      water_ripple: CanvasWaterRippleDrawer,
      floating_kanji: CanvasFloatingKanjiDrawer
    };
    for (const [name, drawer] of Object.entries(map)) {
      renderer.registerShape(name, drawer as never);
    }
  } else if (renderer.type === "skia") {
    const map: Record<string, ShapeDrawer<SkCanvas, CoreComponentRegistry>> = {
      ink_splash: SkiaInkSplashDrawer,
      ink_bleed: SkiaInkBleedDrawer,
      brush_stroke: SkiaBrushStrokeDrawer,
      dry_brush_trail: SkiaDryBrushTrailDrawer,
      seal_stamp: SkiaSealStampDrawer,
      mist_layer: SkiaMistLayerDrawer,
      water_ripple: SkiaWaterRippleDrawer,
      floating_kanji: SkiaFloatingKanjiDrawer
    };
    for (const [name, drawer] of Object.entries(map)) {
      renderer.registerShape(name, drawer as never);
    }
  }
}
