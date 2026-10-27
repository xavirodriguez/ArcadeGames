/**
 * InkWashParallaxBackdrop.ts
 * Shared deterministic ink-wash parallax silhouette generator.
 *
 * Extracted from Hit & Run's SumiETheme (src/games/hitandrun/rendering/theme/sumi-e/SumiETheme.ts)
 * so any game can render the same layered depth-silhouette technique with its own palette.
 *
 * Pure sine-based depth layers: no RNG, no noise, fully deterministic from
 * (viewport size, cameraX, layer index). computeInkWashLayers() is renderer-agnostic
 * geometry; drawInkWashLayersCanvas() / drawInkWashLayersSkia() are the consumers.
 *
 * Phase 0 of the Sumi-e / shan-shui background integration roadmap.
 */

import { Skia, getPaint } from "./SkiaContext";
import type { SkCanvas } from "./SkiaContext";

export interface InkWashLayerSpec {
  /** Parallax factor applied to cameraX, 0 (static) .. 1 (full camera speed). */
  depth: number;
  /** Opacity of this layer's ink wash, 0..1. */
  alpha: number;
  /** Vertical anchor of the silhouette base, as a fraction of viewport height. */
  yRatio: number;
  /** Silhouette amplitude in pixels. */
  height: number;
}

/** The 4-layer depth stack used by SumiETheme's backdrop (far mountains -> near houses). */
export const DEFAULT_INK_WASH_LAYERS: readonly InkWashLayerSpec[] = [
  { depth: 0.08, alpha: 0.08, yRatio: 0.25, height: 120 },
  { depth: 0.15, alpha: 0.14, yRatio: 0.35, height: 90 },
  { depth: 0.28, alpha: 0.22, yRatio: 0.42, height: 70 },
  { depth: 0.45, alpha: 0.32, yRatio: 0.48, height: 50 }
];

/** Deeper mountain stack for dramatic shan-shui vistas. */
export const MOUNTAIN_INK_WASH_LAYERS: readonly InkWashLayerSpec[] = [
  { depth: 0.05, alpha: 0.06, yRatio: 0.18, height: 160 },
  { depth: 0.12, alpha: 0.12, yRatio: 0.28, height: 130 },
  { depth: 0.22, alpha: 0.18, yRatio: 0.38, height: 100 },
  { depth: 0.35, alpha: 0.26, yRatio: 0.46, height: 75 },
  { depth: 0.5, alpha: 0.34, yRatio: 0.52, height: 55 }
];

/** Coastal / river variant with lower horizon. */
export const COASTAL_INK_WASH_LAYERS: readonly InkWashLayerSpec[] = [
  { depth: 0.06, alpha: 0.07, yRatio: 0.32, height: 90 },
  { depth: 0.14, alpha: 0.13, yRatio: 0.42, height: 70 },
  { depth: 0.26, alpha: 0.2, yRatio: 0.5, height: 55 },
  { depth: 0.42, alpha: 0.3, yRatio: 0.58, height: 40 }
];

export interface InkWashSilhouettePoint {
  x: number;
  y: number;
}

export interface InkWashLayerGeometry {
  alpha: number;
  /**
   * Two horizontally-tiled passes of the silhouette polygon (so the layer wraps
   * seamlessly as cameraX scrolls), each already closed against baseY + height.
   */
  passes: readonly (readonly InkWashSilhouettePoint[])[];
}

export interface InkWashDrawOptions {
  /** Ink color for the silhouettes (default pure black/near-black). */
  inkColor?: string;
  /** Optional paper / background fill drawn first. */
  paperColor?: string;
  /** Extra vertical offset applied to all layers (px). */
  yOffset?: number;
  /** Multiplier on all layer alphas (0..1+). */
  alphaScale?: number;
}

/**
 * Pure geometry: given viewport size, camera X and a set of layer specs, returns the
 * silhouette point lists for each layer/pass. No Canvas calls, no randomness — safe to
 * call every frame, or to memoize by (w, h, cameraX, layers) if a caller needs that.
 */
export function computeInkWashLayers(
  w: number,
  h: number,
  cameraX: number,
  layers: readonly InkWashLayerSpec[] = DEFAULT_INK_WASH_LAYERS,
  step = 40
): InkWashLayerGeometry[] {
  return layers.map((layer, i) => {
    const offsetX = (-cameraX * layer.depth) % w;
    const baseY = h * layer.yRatio;
    const passes: InkWashSilhouettePoint[][] = [];

    for (let pass = 0; pass < 2; pass++) {
      const passX = offsetX + pass * w;
      const points: InkWashSilhouettePoint[] = [{ x: passX, y: baseY + layer.height }];
      for (let x = 0; x <= w; x += step) {
        const silhouetteY = baseY + Math.sin((x + passX) * 0.008 + i) * layer.height * 0.5;
        points.push({ x: passX + x, y: silhouetteY });
      }
      points.push({ x: passX + w, y: baseY + layer.height });
      passes.push(points);
    }

    return { alpha: layer.alpha, passes };
  });
}

/**
 * Canvas2D consumer: fills each layer's silhouette with `inkColor` at the layer's alpha.
 * Caller owns ctx.save()/ctx.restore() around this call; globalAlpha is reset to 1 before
 * returning so it never leaks into whatever the caller draws next.
 *
 * Accepts either a plain ink color string (legacy) or InkWashDrawOptions.
 */
export function drawInkWashLayersCanvas(
  ctx: CanvasRenderingContext2D,
  geometry: readonly InkWashLayerGeometry[],
  inkColorOrOptions: string | InkWashDrawOptions = "#171817"
): void {
  const opts: InkWashDrawOptions =
    typeof inkColorOrOptions === "string"
      ? { inkColor: inkColorOrOptions }
      : inkColorOrOptions;

  const inkColor = opts.inkColor ?? "#171817";
  const alphaScale = opts.alphaScale ?? 1;
  const yOffset = opts.yOffset ?? 0;

  if (opts.paperColor) {
    ctx.fillStyle = opts.paperColor;
    ctx.globalAlpha = 1;
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  }

  ctx.fillStyle = inkColor;
  for (let i = 0; i < geometry.length; i++) {
    const layer = geometry[i];
    ctx.globalAlpha = Math.min(1, layer.alpha * alphaScale);
    for (let p = 0; p < layer.passes.length; p++) {
      const pts = layer.passes[p];
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y + yOffset);
      for (let k = 1; k < pts.length; k++) {
        ctx.lineTo(pts[k].x, pts[k].y + yOffset);
      }
      ctx.closePath();
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}

/**
 * Skia consumer: same geometry, filled with ink color at per-layer alpha.
 * Safe no-op when Skia is unavailable (tests / headless).
 */
export function drawInkWashLayersSkia(
  canvas: SkCanvas,
  geometry: readonly InkWashLayerGeometry[],
  inkColorOrOptions: string | InkWashDrawOptions = "#171817",
  viewportW?: number,
  viewportH?: number
): void {
  if (!Skia || !canvas) return;

  const opts: InkWashDrawOptions =
    typeof inkColorOrOptions === "string"
      ? { inkColor: inkColorOrOptions }
      : inkColorOrOptions;

  const inkColor = opts.inkColor ?? "#171817";
  const alphaScale = opts.alphaScale ?? 1;
  const yOffset = opts.yOffset ?? 0;

  const paint = getPaint();
  if (!paint) return;

  if (opts.paperColor && viewportW != null && viewportH != null) {
    paint.setColor(Skia.Color(opts.paperColor));
    paint.setAlphaf(1);
    canvas.drawRect(Skia.XYWHRect(0, 0, viewportW, viewportH), paint);
  }

  paint.setColor(Skia.Color(inkColor));

  for (let i = 0; i < geometry.length; i++) {
    const layer = geometry[i];
    paint.setAlphaf(Math.min(1, layer.alpha * alphaScale));

    for (let p = 0; p < layer.passes.length; p++) {
      const pts = layer.passes[p];
      if (pts.length < 2) continue;

      const path = Skia.Path.Make();
      path.moveTo(pts[0].x, pts[0].y + yOffset);
      for (let k = 1; k < pts.length; k++) {
        path.lineTo(pts[k].x, pts[k].y + yOffset);
      }
      path.close();
      canvas.drawPath(path, paint);
    }
  }

  // Reset alpha so subsequent draws are not affected
  paint.setAlphaf(1);
}

/**
 * Convenience: compute + draw in one call for Canvas.
 */
export function renderInkWashBackdropCanvas(
  ctx: CanvasRenderingContext2D,
  cameraX: number,
  layers: readonly InkWashLayerSpec[] = DEFAULT_INK_WASH_LAYERS,
  options?: InkWashDrawOptions
): void {
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;
  const geometry = computeInkWashLayers(w, h, cameraX, layers);
  drawInkWashLayersCanvas(ctx, geometry, options ?? { inkColor: "#171817" });
}

/**
 * Convenience: compute + draw in one call for Skia.
 */
export function renderInkWashBackdropSkia(
  canvas: SkCanvas,
  w: number,
  h: number,
  cameraX: number,
  layers: readonly InkWashLayerSpec[] = DEFAULT_INK_WASH_LAYERS,
  options?: InkWashDrawOptions
): void {
  const geometry = computeInkWashLayers(w, h, cameraX, layers);
  drawInkWashLayersSkia(canvas, geometry, options ?? { inkColor: "#171817" }, w, h);
}
