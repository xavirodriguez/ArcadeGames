import { RenderContext } from "../../rendering/Renderer";
import { ITransitionEffect, TransitionOptions } from "../TransitionTypes";

/**
 * Scanline / CRT Wipe transition.
 * Sweeps a horizontal electron beam line from top to bottom, replacing the scene.
 *
 * @public
 */
// TODO(refactor): código duplicado detectado (bloque) con scenes/transitions/FadeTransition.ts:10-25. Considerar extraer a función compartida. Ref: 9360e5da
export class ScanlineWipeTransition implements ITransitionEffect {
  /**
   * Renders the Scanline CRT sweep effect.
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
    const lineColor = options?.lineColor ?? "#00FFFF";
    const lineWidth = options?.lineWidth ?? 4;

    let sweepY = 0;
    let isOutPhase = true;

    if (progress <= 0.5) {
      const t = progress / 0.5; // 0.0 -> 1.0
      sweepY = height * t;
      isOutPhase = true;
    } else {
      const t = (progress - 0.5) / 0.5; // 0.0 -> 1.0
      sweepY = height * t;
      isOutPhase = false;
    }

    ctx.save();

    // 1. Draw solid color coverage area
    ctx.fillStyle = color;
    if (isOutPhase) {
      // Solid behind the sweep line (already wiped out)
      ctx.fillRect(0, 0, width, sweepY);
    } else {
      // Solid in front of the sweep line (yet to be revealed)
      ctx.fillRect(0, sweepY, width, height - sweepY);
    }

    // 2. Draw glowing neon sweep line
    if (sweepY > 0 && sweepY < height) {
      // Outer glow
      ctx.strokeStyle = lineColor;
      ctx.lineWidth = lineWidth * 2;
      ctx.globalAlpha = 0.4;
      ctx.beginPath();
      ctx.moveTo(0, sweepY);
      ctx.lineTo(width, sweepY);
      ctx.stroke();

      // Inner core
      ctx.strokeStyle = "#FFFFFF";
      ctx.lineWidth = lineWidth / 2;
      ctx.globalAlpha = 1.0;
      ctx.beginPath();
      ctx.moveTo(0, sweepY);
      ctx.lineTo(width, sweepY);
      ctx.stroke();
    }

    ctx.restore();
  }
}
