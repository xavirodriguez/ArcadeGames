import { RenderContext } from "../../rendering/Renderer";
import { ITransitionEffect, TransitionOptions } from "../TransitionTypes";

/**
 * A pulsating red Danger vignette transition.
 * Simulates a heartbeat low-health warning.
 *
 * @public
 */
export class DangerPulseTransition implements ITransitionEffect {
  /**
   * Set drawsBothScenes to false to simply overlay on top of whatever is already rendered on the active scene.
   */
  public readonly drawsBothScenes = false;

  /**
   * Renders the low-HP danger vignette pulse.
   * @param ctx - The CanvasRenderingContext2D or RenderContext.
   * @param progress - Transition progress from 0.0 to 1.0 (used as the time/pulse driver).
   * @param options - Visual configurations.
   */
  private cachedGrad?: any;
  private cachedCtx?: RenderContext;
  private cachedCX?: number;
  private cachedCY?: number;
  private cachedInnerR?: number;
  private cachedOuterR?: number;
  private cachedColor?: string;

  // TODO(refactor): código duplicado detectado (método) con scenes/transitions/DitherTransition.ts:16-30. Considerar extraer a función compartida. Ref: f320351e
  public render(ctx: RenderContext, progress: number, options?: TransitionOptions): void {
    const canvas = ctx.canvas;
    if (!canvas) return;

    const width = canvas.width ?? 800;
    const height = canvas.height ?? 600;
    const cx = options?.centerX ?? (width / 2);
    const cy = options?.centerY ?? (height / 2);
    const color = options?.color ?? "#FF0000";

    // Pulsate opacity based on progress
    const frequency = options?.frequency ?? 4; // Number of heartbeats
    const wave = Math.sin(progress * Math.PI * 2 * frequency);
    const pulseOpacity = 0.15 + 0.35 * Math.max(0, wave); // Clamp positive wave only

    ctx.save();

    const innerRadius = Math.min(width, height) * 0.25;
    const outerRadius = Math.sqrt(cx * cx + cy * cy);

    if (
      !this.cachedGrad ||
      this.cachedCtx !== ctx ||
      this.cachedCX !== cx ||
      this.cachedCY !== cy ||
      this.cachedInnerR !== innerRadius ||
      this.cachedOuterR !== outerRadius ||
      this.cachedColor !== color
    ) {
      const grad = ctx.createRadialGradient(cx, cy, innerRadius, cx, cy, outerRadius);
      grad.addColorStop(0, "rgba(0, 0, 0, 0)");
      grad.addColorStop(1, color);
      this.cachedGrad = grad;
      this.cachedCtx = ctx;
      this.cachedCX = cx;
      this.cachedCY = cy;
      this.cachedInnerR = innerRadius;
      this.cachedOuterR = outerRadius;
      this.cachedColor = color;
    }

    ctx.fillStyle = this.cachedGrad;
    ctx.globalAlpha = pulseOpacity;
    ctx.fillRect(0, 0, width, height);

    ctx.restore();
  }
}
