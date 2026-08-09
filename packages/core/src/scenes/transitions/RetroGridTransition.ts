import { RenderContext } from "../../rendering/Renderer";
import { ITransitionEffect, TransitionOptions } from "../TransitionTypes";

/**
 * A highly retro grid transition.
 * Breaks the old scene into block cells that scale down in sequence based on their coordinates.
 *
 * @public
 */
export class RetroGridTransition implements ITransitionEffect {
  /**
   * Set flag to indicate that both scenes should be drawn.
   */
  public readonly drawsBothScenes = true;

  /**
   * Renders the sequencial grid scaleout transition.
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
    const blockSize = options?.blockSize ?? 40;

    const cols = Math.ceil(width / blockSize);
    const rows = Math.ceil(height / blockSize);

    ctx.save();
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        // Compute threshold from coordinates to stagger the sequence
        const threshold = (c + r) / (cols + rows);
        // Map individual cell progress
        const cellProgress = Math.max(0, Math.min(1, (1 - progress - threshold * 0.4) * 2.5));

        if (cellProgress <= 0) continue;

        const cx = c * blockSize + blockSize / 2;
        const cy = r * blockSize + blockSize / 2;
        const w = blockSize * cellProgress;
        const h = blockSize * cellProgress;

        ctx.drawImage(off, c * blockSize, r * blockSize, blockSize, blockSize, cx - w / 2, cy - h / 2, w, h);
      }
    }
    ctx.restore();
  }
}
