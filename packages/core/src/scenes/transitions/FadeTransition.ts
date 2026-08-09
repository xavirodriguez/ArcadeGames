import { RenderContext } from "../../rendering/Renderer";
import { ITransitionEffect, TransitionOptions } from "../TransitionTypes";

/**
 * A standard fade-to-color transition.
 * Interpolates opacity smoothly to full color at midpoint and back to transparent.
 *
 * @public
 */
export class FadeTransition implements ITransitionEffect {
  /**
   * Renders the fade transition effect.
   * @param ctx - The CanvasRenderingContext2D or RenderContext.
   * @param progress - Transition progress from 0.0 to 1.0.
   * @param options - Visual configurations.
   */
  public render(ctx: RenderContext, progress: number, options?: TransitionOptions): void {
    const canvas = ctx.canvas;
    if (!canvas) return;

    const width = canvas.width ?? 800;
    const height = canvas.height ?? 600;
    const color = options?.color ?? "#000000";

    let opacity = 0;
    if (progress <= 0.5) {
      opacity = progress / 0.5; // 0.0 -> 1.0 (fade-out)
    } else {
      opacity = 1 - ((progress - 0.5) / 0.5); // 1.0 -> 0.0 (fade-in)
    }

    if (opacity <= 0) return;

    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, width, height);
    ctx.restore();
  }
}
