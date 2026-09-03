import { RenderContext } from "../../rendering/Renderer";
import { ITransitionEffect, TransitionOptions } from "../TransitionTypes";

/**
 * A vintage clock-like radial sweep wipe.
 * Sweeps a radial sector mask from 0 to 360 degrees.
 *
 * @public
 */
// TODO(refactor): código duplicado detectado (bloque) con scenes/transitions/CRTGlitchTransition.ts:10-30. Considerar extraer a función compartida. Ref: a920e233
export class RadialWipeTransition implements ITransitionEffect {
  /**
   * Set flag to indicate that both scenes should be drawn.
   */
  public readonly drawsBothScenes = true;

  /**
   * Renders the radial Clock wipe.
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

    const cx = width / 2;
    const cy = height / 2;
    const radius = Math.sqrt(cx * cx + cy * cy);
    const startAngle = -Math.PI / 2; // top center
    const endAngle = startAngle + Math.PI * 2 * (1 - progress);

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radius, startAngle, endAngle);
    ctx.closePath();
    ctx.clip();

    ctx.drawImage(off, 0, 0);
    ctx.restore();
  }
}
