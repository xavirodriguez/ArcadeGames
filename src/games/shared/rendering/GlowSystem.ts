import { Skia, getPaint } from "./SkiaContext";
import { COSMIC_ARCADE_PALETTE } from "./CosmicPalette";

export type GlowIntensity = "subtle" | "normal" | "strong" | "critical";

export interface GlowStyle {
  color: string;
  intensity: GlowIntensity;
  auraBlur: number;
  haloBlur: number;
  auraAlpha: number;
  haloAlpha: number;
  highlightColor: string;
}

export const GLOW_PRESETS: Record<GlowIntensity, { auraBlur: number; haloBlur: number; auraAlpha: number; haloAlpha: number }> = {
  subtle: { auraBlur: 4, haloBlur: 10, auraAlpha: 0.2, haloAlpha: 0.08 },
  normal: { auraBlur: 8, haloBlur: 18, auraAlpha: 0.35, haloAlpha: 0.15 },
  strong: { auraBlur: 14, haloBlur: 28, auraAlpha: 0.5, haloAlpha: 0.25 },
  critical: { auraBlur: 22, haloBlur: 40, auraAlpha: 0.7, haloAlpha: 0.35 }
};

/**
 * Returns a GlowStyle configuration for the given color and intensity.
 */
export function getGlowStyle(color: string, intensity: GlowIntensity = "normal"): GlowStyle {
  const preset = GLOW_PRESETS[intensity];
  return {
    color,
    intensity,
    auraBlur: preset.auraBlur,
    haloBlur: preset.haloBlur,
    auraAlpha: preset.auraAlpha,
    haloAlpha: preset.haloAlpha,
    highlightColor: COSMIC_ARCADE_PALETTE.iceBlue
  };
}

/**
 * Executes a 4-layer (Halo, Aura, Core, Highlight) glow rendering pass in Canvas2D.
 * Accepts a callback to render the shape.
 */
export function renderCanvasGlow(
  ctx: CanvasRenderingContext2D,
  glow: GlowStyle,
  drawShape: (ctx: CanvasRenderingContext2D, isHighlight?: boolean) => void
): void {
  ctx.save();

  // 1. Halo Layer (High blur, low alpha)
  ctx.save();
  ctx.shadowColor = glow.color;
  ctx.shadowBlur = glow.haloBlur;
  ctx.globalAlpha = glow.haloAlpha;
  ctx.strokeStyle = glow.color;
  ctx.fillStyle = glow.color;
  drawShape(ctx);
  ctx.restore();

  // 2. Aura Layer (Moderate blur, medium alpha)
  ctx.save();
  ctx.shadowColor = glow.color;
  ctx.shadowBlur = glow.auraBlur;
  ctx.globalAlpha = glow.auraAlpha;
  ctx.strokeStyle = glow.color;
  ctx.fillStyle = glow.color;
  drawShape(ctx);
  ctx.restore();

  // 3. Core Layer (No blur, crisp)
  ctx.save();
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1.0;
  ctx.strokeStyle = glow.color;
  ctx.fillStyle = glow.color;
  drawShape(ctx);
  ctx.restore();

  // 4. Highlight Layer (Ice blue / crisp center)
  if (glow.intensity === "strong" || glow.intensity === "critical") {
    ctx.save();
    ctx.shadowBlur = 2;
    ctx.shadowColor = glow.highlightColor;
    ctx.globalAlpha = 0.9;
    ctx.strokeStyle = glow.highlightColor;
    ctx.fillStyle = glow.highlightColor;
    drawShape(ctx, true);
    ctx.restore();
  }

  ctx.restore();
}

/**
 * Executes a glow rendering pass in Skia using cached paints to avoid per-frame allocations.
 */
export function renderSkiaGlow(
  _canvas: Record<string, unknown>,
  glow: GlowStyle,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  drawShapeSkia: (paint: any, isHighlight?: boolean) => void
): void {
  if (!Skia) return;

  const sharedPaint = getPaint();
  if (!sharedPaint) return;

  // 1. Halo Layer
  sharedPaint.setColor(Skia.Color(glow.color));
  sharedPaint.setAlphaf(glow.haloAlpha);
  if (Skia.MaskFilter) {
    sharedPaint.setMaskFilter(Skia.MaskFilter.MakeBlur(Skia.BlurMode.Normal, glow.haloBlur, true));
  } else {
    sharedPaint.setMaskFilter(null);
  }
  drawShapeSkia(sharedPaint);

  // 2. Aura Layer
  sharedPaint.setColor(Skia.Color(glow.color));
  sharedPaint.setAlphaf(glow.auraAlpha);
  if (Skia.MaskFilter) {
    sharedPaint.setMaskFilter(Skia.MaskFilter.MakeBlur(Skia.BlurMode.Normal, glow.auraBlur, true));
  } else {
    sharedPaint.setMaskFilter(null);
  }
  drawShapeSkia(sharedPaint);

  // 3. Core Layer
  sharedPaint.setColor(Skia.Color(glow.color));
  sharedPaint.setAlphaf(1.0);
  sharedPaint.setMaskFilter(null);
  drawShapeSkia(sharedPaint);

  // 4. Highlight Layer
  if (glow.intensity === "strong" || glow.intensity === "critical") {
    sharedPaint.setColor(Skia.Color(glow.highlightColor));
    sharedPaint.setAlphaf(0.85);
    sharedPaint.setMaskFilter(null);
    drawShapeSkia(sharedPaint, true);
  }
}
