import { RenderContext } from "../../rendering/Renderer";
import { TransitionOptions } from "../TransitionTypes";
import { BaseOffscreenTransitionEffect } from "./BaseTransitionEffect";
import { iterateGridBlocks } from "./GridTransitionUtils";

/**
 * A highly retro grid transition.
 * Breaks the old scene into block cells that scale down in sequence based on their coordinates.
 *
 * @public
 */
export class RetroGridTransition extends BaseOffscreenTransitionEffect {
  /**
   * Paints the sequential grid scaleout transition.
   *
   * @param ctx - The CanvasRenderingContext2D or RenderContext.
   * @param offscreenCanvas - The offscreen canvas containing the outgoing scene.
   * @param progress - Transition progress from 0.0 to 1.0.
   * @param width - Canvas width.
   * @param height - Canvas height.
   * @param options - Visual configurations.
   */
  protected paintOffscreen(
    ctx: RenderContext,
    offscreenCanvas: CanvasImageSource | HTMLCanvasElement,
    progress: number,
    width: number,
    height: number,
    options?: TransitionOptions
  ): void {
    const blockSize = options?.blockSize ?? 40;

    iterateGridBlocks(width, height, blockSize, (c, r, cellX, cellY, cols, rows) => {
      // Compute threshold from coordinates to stagger the sequence
      const threshold = (c + r) / (cols + rows);
      // Map individual cell progress
      const cellProgress = Math.max(0, Math.min(1, (1 - progress - threshold * 0.4) * 2.5));

      if (cellProgress <= 0) return;

      const cx = cellX + blockSize / 2;
      const cy = cellY + blockSize / 2;
      const w = blockSize * cellProgress;
      const h = blockSize * cellProgress;

      (ctx as CanvasRenderingContext2D).drawImage(
        offscreenCanvas,
        cellX,
        cellY,
        blockSize,
        blockSize,
        cx - w / 2,
        cy - h / 2,
        w,
        h
      );
    });
  }
}
