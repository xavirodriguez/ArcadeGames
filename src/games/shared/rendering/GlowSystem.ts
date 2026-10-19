import { Skia, getPaint } from "./SkiaContext";
import { COSMIC_ARCADE_PALETTE } from "./CosmicPalette";
import { CanvasGlowCache } from "./CanvasGlowCache";

export { CanvasGlowCache };

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
 * Resolves current glow degradation level based on p95 frame-time in ms.
 * Level 0: full quality.
 * Level 1 (p95 > 8ms): skip Halo layer or reduce blur.
 * Level 2 (p95 > 12ms): skip Halo + Aura layers.
 * Level 3 (p95 > 16ms): crisp Core layer only.
 */
export function getGlowDegradationLevel(p95Ms?: number): number {
  let measuredP95 = p95Ms;
  if (measuredP95 === undefined && typeof globalThis !== "undefined") {
    const globalObj = globalThis as unknown as { __ARCADE_PERF_P95__?: number };
    measuredP95 = globalObj.__ARCADE_PERF_P95__ ?? 0;
  }
  const currentP95 = measuredP95 ?? 0;
  if (currentP95 > 16) return 3;
  if (currentP95 > 12) return 2;
  if (currentP95 > 8) return 1;
  return 0;
}

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
 * Options for offscreen sprite caching in `renderCanvasGlow`.
 */
export interface GlowCacheOptions {
  key: string;
  width: number;
  height: number;
}

/**
 * Executes a 4-layer (Halo, Aura, Core, Highlight) glow rendering pass in Canvas2D.
 * Caches offscreen sprites when `cacheOptions` is provided and applies adaptive degradation.
 */
export function renderCanvasGlow(
  ctx: CanvasRenderingContext2D,
  glow: GlowStyle,
  drawShape: (ctx: CanvasRenderingContext2D, isHighlight?: boolean) => void,
  cacheOptions?: GlowCacheOptions,
  p95Ms?: number
): void {
  const level = getGlowDegradationLevel(p95Ms);

  if (cacheOptions) {
    const glowCache = CanvasGlowCache.getInstance();
    const haloBlur = level >= 1 ? 0 : glow.haloBlur;
    const auraBlur = level >= 2 ? 0 : glow.auraBlur;
    const cacheKey = `glow_${cacheOptions.key}_${glow.color}_${glow.intensity}_h${haloBlur}_a${auraBlur}_lvl${level}`;

    const padding = Math.ceil(Math.max(glow.haloBlur, glow.auraBlur) * 2 + 10);
    const totalWidth = cacheOptions.width + padding * 2;
    const totalHeight = cacheOptions.height + padding * 2;

    const offscreen = glowCache.getOrCreate(cacheKey, totalWidth, totalHeight, (offCtx) => {
      offCtx.save();
      offCtx.translate(totalWidth / 2, totalHeight / 2);

      // 1. Halo Layer (high blur, skipped at degradation level >= 1)
      if (level < 1 && glow.haloAlpha > 0 && haloBlur > 0) {
        offCtx.save();
        offCtx.shadowColor = glow.color;
        offCtx.shadowBlur = haloBlur;
        offCtx.globalAlpha = glow.haloAlpha;
        offCtx.strokeStyle = glow.color;
        offCtx.fillStyle = glow.color;
        drawShape(offCtx);
        offCtx.restore();
      }

      // 2. Aura Layer (moderate blur, skipped at degradation level >= 2)
      if (level < 2 && glow.auraAlpha > 0 && auraBlur > 0) {
        offCtx.save();
        offCtx.shadowColor = glow.color;
        offCtx.shadowBlur = auraBlur;
        offCtx.globalAlpha = glow.auraAlpha;
        offCtx.strokeStyle = glow.color;
        offCtx.fillStyle = glow.color;
        drawShape(offCtx);
        offCtx.restore();
      }

      // 3. Core Layer (no blur, crisp)
      offCtx.save();
      offCtx.shadowBlur = 0;
      offCtx.globalAlpha = 1.0;
      offCtx.strokeStyle = glow.color;
      offCtx.fillStyle = glow.color;
      drawShape(offCtx);
      offCtx.restore();

      // 4. Highlight Layer
      if (glow.intensity === "strong" || glow.intensity === "critical") {
        offCtx.save();
        offCtx.shadowBlur = level >= 3 ? 0 : 2;
        offCtx.shadowColor = glow.highlightColor;
        offCtx.globalAlpha = 0.9;
        offCtx.strokeStyle = glow.highlightColor;
        offCtx.fillStyle = glow.highlightColor;
        drawShape(offCtx, true);
        offCtx.restore();
      }

      offCtx.restore();
    });

    if (offscreen) {
      ctx.drawImage(offscreen as CanvasImageSource, -totalWidth / 2, -totalHeight / 2);
    }
    return;
  }

  // Fallback direct rendering with degradation:
  ctx.save();

  if (level < 1 && glow.haloAlpha > 0 && glow.haloBlur > 0) {
    ctx.save();
    ctx.shadowColor = glow.color;
    ctx.shadowBlur = glow.haloBlur;
    ctx.globalAlpha = glow.haloAlpha;
    ctx.strokeStyle = glow.color;
    ctx.fillStyle = glow.color;
    drawShape(ctx);
    ctx.restore();
  }

  if (level < 2 && glow.auraAlpha > 0 && glow.auraBlur > 0) {
    ctx.save();
    ctx.shadowColor = glow.color;
    ctx.shadowBlur = glow.auraBlur;
    ctx.globalAlpha = glow.auraAlpha;
    ctx.strokeStyle = glow.color;
    ctx.fillStyle = glow.color;
    drawShape(ctx);
    ctx.restore();
  }

  ctx.save();
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1.0;
  ctx.strokeStyle = glow.color;
  ctx.fillStyle = glow.color;
  drawShape(ctx);
  ctx.restore();

  if (glow.intensity === "strong" || glow.intensity === "critical") {
    ctx.save();
    ctx.shadowBlur = level >= 3 ? 0 : 2;
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
  _canvas: unknown,
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
