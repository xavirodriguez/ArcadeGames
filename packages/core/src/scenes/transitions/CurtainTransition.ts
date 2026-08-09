import { RenderContext } from "../../rendering/Renderer";
import { ITransitionEffect, TransitionOptions } from "../TransitionTypes";

/**
 * A classic curtain-split transition.
 * Splits the old scene down the center and slides both halves outward to reveal the new scene.
 *
 * @public
 */
export class CurtainTransition implements ITransitionEffect {
  /**
   * Set flag to indicate that both scenes should be drawn.
   */
  public readonly drawsBothScenes = true;

  /**
   * Renders the curtain split visual.
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
    const shift = progress * (width / 2);

    ctx.save();
    // Left half
    ctx.drawImage(off, 0, 0, width / 2, height, -shift, 0, width / 2, height);
    // Right half
    ctx.drawImage(off, width / 2, 0, width / 2, height, width / 2 + shift, 0, width / 2, height);
    ctx.restore();
  }
}
