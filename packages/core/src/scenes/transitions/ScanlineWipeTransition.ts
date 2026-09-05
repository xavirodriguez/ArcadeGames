import { RenderContext } from "../../rendering/Renderer";
import { TransitionOptions } from "../TransitionTypes";
import { BaseTransitionEffect } from "./BaseTransitionEffect";

/**
 * Scanline / CRT Wipe transition.
 * Sweeps a horizontal electron beam line from top to bottom, replacing the scene.
 *
 * @public
 */
export class ScanlineWipeTransition extends BaseTransitionEffect {
  /**
   * Paints the Scanline CRT sweep effect.
   *
   * @param ctx - The CanvasRenderingContext2D or RenderContext.
   * @param progress - Transition progress from 0.0 to 1.0.
   * @param width - Canvas width.
   * @param height - Canvas height.
   * @param options - Visual configurations.
   */
  protected paint(
    ctx: RenderContext,
    progress: number,
    width: number,
    height: number,
    options?: TransitionOptions
  ): void {
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
  }
}
