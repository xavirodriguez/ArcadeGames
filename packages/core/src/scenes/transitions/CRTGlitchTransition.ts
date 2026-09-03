import { RenderContext } from "../../rendering/Renderer";
import { ITransitionEffect, TransitionOptions } from "../TransitionTypes";

/**
 * A retro CRT/Signal Glitch transition effect.
 * Distorts the scene horizontally, slices the screen, and draws scanline artifacts.
 *
 * @public
 */
// TODO(refactor): código duplicado detectado (bloque) con scenes/transitions/CurtainTransition.ts:10-28. Considerar extraer a función compartida. Ref: e9dcf478
export class CRTGlitchTransition implements ITransitionEffect {
  /**
   * Set flag to indicate that both scenes should be drawn.
   */
  public readonly drawsBothScenes = true;

  /**
   * Renders the signal glitch effect.
   * @param ctx - The CanvasRenderingContext2D or RenderContext.
   * @param progress - Transition progress from 0.0 to 1.0.
   * @param options - Visual configurations.
   */
  public render(ctx: RenderContext, progress: number, options?: TransitionOptions): void {
    const off = options?.offscreenCanvas;
    const canvas = ctx.canvas;
    if (!off || !canvas) return;

    const width = canvas.width ?? 800;
    const height = canvas.height ?? 600;

    ctx.save();

    // 1. Draw horizontal displacement slices
    const sliceHeight = options?.sliceHeight ?? 8;
    const numSlices = Math.ceil(height / sliceHeight);
    const intensity = options?.intensity ?? 1.0;

    // Wobble amplitude fades towards the end
    const amplitude = 30 * intensity * (1 - progress);

    for (let i = 0; i < numSlices; i++) {
      const y = i * sliceHeight;
      // Procedural displacement wave using sine
      const wave = Math.sin(y * 0.05 + progress * 50) * amplitude;
      // Add occasional static jump/glitch
      const offset = (Math.sin(y * 0.5 + progress * 100) > 0.8) ? wave * 2 : wave;

      ctx.drawImage(off, 0, y, width, sliceHeight, offset, y, width, sliceHeight);
    }

    // 2. Draw rolling horizontal interference line
    const rollY = (progress * height * 2) % height;
    ctx.fillStyle = "rgba(255, 255, 255, 0.15)";
    ctx.fillRect(0, rollY, width, 6);

    // 3. Draw a vintage RGB color separation overlay
    if (progress < 0.8) {
      ctx.globalCompositeOperation = "screen";
      ctx.fillStyle = "rgba(255, 0, 0, 0.1)";
      ctx.fillRect(2, 0, width, height);
      ctx.fillStyle = "rgba(0, 0, 255, 0.1)";
      ctx.fillRect(-2, 0, width, height);
    }

    ctx.restore();
  }
}
