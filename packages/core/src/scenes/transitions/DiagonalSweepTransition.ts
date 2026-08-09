import { RenderContext } from "../../rendering/Renderer";
import { ITransitionEffect, TransitionOptions } from "../TransitionTypes";

/**
 * A sleek retro diagonal sweep wipe.
 * Clips the old scene to a diagonal polygon that slides top-left to bottom-right.
 *
 * @public
 */
export class DiagonalSweepTransition implements ITransitionEffect {
  /**
   * Set flag to indicate that both scenes should be drawn.
   */
  public readonly drawsBothScenes = true;

  /**
   * Renders the diagonal sweep wipe.
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
    // Diagonal frontier sweep line
    const maxDist = width + height;
    const currentDist = maxDist * (1 - progress);

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(currentDist, 0);
    ctx.lineTo(0, currentDist);
    ctx.closePath();
    ctx.clip();

    ctx.drawImage(off, 0, 0);
    ctx.restore();
  }
}
