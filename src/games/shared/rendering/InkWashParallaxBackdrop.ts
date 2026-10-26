/**
 * InkWashParallaxBackdrop.ts
 * Shared deterministic ink-wash parallax silhouette generator.
 *
 * Extracted from Hit & Run's SumiETheme (src/games/hitandrun/rendering/theme/sumi-e/SumiETheme.ts)
 * so any game can render the same layered depth-silhouette technique with its own palette.
 *
 * Pure sine-based depth layers: no RNG, no noise, fully deterministic from
 * (viewport size, cameraX, layer index). computeInkWashLayers() is renderer-agnostic
 * geometry; drawInkWashLayersCanvas() is the Canvas2D consumer. A Skia consumer can be
 * added later against the same geometry without touching this function.
 */

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
 */
export function drawInkWashLayersCanvas(
  ctx: CanvasRenderingContext2D,
  geometry: readonly InkWashLayerGeometry[],
  inkColor: string
): void {
  ctx.fillStyle = inkColor;
  for (let i = 0; i < geometry.length; i++) {
    const layer = geometry[i];
    ctx.globalAlpha = layer.alpha;
    for (let p = 0; p < layer.passes.length; p++) {
      const pts = layer.passes[p];
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let k = 1; k < pts.length; k++) ctx.lineTo(pts[k].x, pts[k].y);
      ctx.closePath();
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}
