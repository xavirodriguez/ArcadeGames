import { RenderContext } from "../../rendering/Renderer";
import { ITransitionEffect, TransitionOptions } from "../TransitionTypes";

/**
 * A smooth cross-dissolve/blending transition between scenes.
 * Renders both the outgoing and incoming scenes blended together.
 *
 * @public
 */
export class CrossfadeTransition implements ITransitionEffect {
  /**
   * Set flag to indicate that both scenes should be drawn.
   */
  public readonly drawsBothScenes = true;

  /**
   * Renders the crossfade transition effect.
   * @param ctx - The CanvasRenderingContext2D or RenderContext.
   * @param progress - Transition progress from 0.0 to 1.0.
   * @param options - Visual configurations.
   */
  public render(ctx: RenderContext, progress: number, options?: TransitionOptions): void {
    const off = options?.offscreenCanvas;
    if (!off) return;

    ctx.save();
    ctx.globalAlpha = Math.max(0, Math.min(1, 1 - progress));
    ctx.drawImage(off, 0, 0);
    ctx.restore();
  }
}
