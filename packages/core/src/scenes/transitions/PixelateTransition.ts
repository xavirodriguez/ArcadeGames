import { RenderContext } from "../../rendering/Renderer";
import { ITransitionEffect, TransitionOptions } from "../TransitionTypes";

let offscreenCanvas: any = null;
let offscreenCtx: any = null;

function getOffscreen(width: number, height: number) {
  if (typeof document === "undefined") {
    return { canvas: null, ctx: null };
  }
  try {
    if (!offscreenCanvas) {
      offscreenCanvas = document.createElement("canvas");
      offscreenCtx = offscreenCanvas.getContext("2d");
    }
    if (offscreenCanvas) {
      if (offscreenCanvas.width !== width || offscreenCanvas.height !== height) {
        offscreenCanvas.width = width;
        offscreenCanvas.height = height;
      }
    }
    return { canvas: offscreenCanvas, ctx: offscreenCtx };
  } catch {
    return { canvas: null, ctx: null };
  }
}

/**
 * Pixelation mosaic transition.
 * Gradually increases pixel block size up to a maximum at midpoint, then reverses.
 *
 * @public
 */
// TODO(refactor): código duplicado detectado (bloque) con scenes/transitions/FadeTransition.ts:10-23. Considerar extraer a función compartida. Ref: 9c415b60
export class PixelateTransition implements ITransitionEffect {
  /**
   * Renders the pixelated scale mosaic effect.
   * @param ctx - The CanvasRenderingContext2D or RenderContext.
   * @param progress - Transition progress from 0.0 to 1.0.
   * @param options - Visual configurations.
   */
  public render(ctx: RenderContext, progress: number, options?: TransitionOptions): void {
    const canvas = ctx.canvas;
    if (!canvas) return;

    const width = canvas.width ?? 800;
    const height = canvas.height ?? 600;
    const maxPixelSize = options?.maxPixelSize ?? 32;

    let blockSize = 1;
    if (progress <= 0.5) {
      const t = progress / 0.5; // 0.0 -> 1.0
      blockSize = 1 + (maxPixelSize - 1) * t;
    } else {
      const t = (progress - 0.5) / 0.5; // 0.0 -> 1.0
      blockSize = maxPixelSize - (maxPixelSize - 1) * t;
    }

    blockSize = Math.round(blockSize);
    if (blockSize <= 1) return;

    const { canvas: off, ctx: octx } = getOffscreen(width, height);
    if (!off || !octx) return;

    const w = Math.max(1, Math.floor(width / blockSize));
    const h = Math.max(1, Math.floor(height / blockSize));

    ctx.save();
    // 1. Copy full canvas down to tiny size on offscreen
    octx.clearRect(0, 0, width, height);
    octx.drawImage(canvas, 0, 0, width, height, 0, 0, w, h);

    // 2. Clear main canvas
    ctx.clearRect(0, 0, width, height);

    // 3. Draw tiny offscreen image back stretched to fill main canvas without smoothing
    ctx.imageSmoothingEnabled = false;
    (ctx as any).mozImageSmoothingEnabled = false;
    (ctx as any).webkitImageSmoothingEnabled = false;
    (ctx as any).msImageSmoothingEnabled = false;

    ctx.drawImage(off, 0, 0, w, h, 0, 0, width, height);
    ctx.restore();
  }
}
