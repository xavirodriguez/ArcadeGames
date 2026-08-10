import { RenderCommandBufferImpl } from "./RenderCommandBuffer";
import { RenderCommandBuffer } from "./RenderTypes";

/**
 * Double-buffering Render Pipeline that decouples game logic from visual rendering loops.
 *
 * @remarks
 * Maintains an active buffer (for current rendering) and a back buffer (for writing new commands),
 * allowing zero-allocation swaps to prevent tearing, flickers, and logic/render cross-contamination.
 * @public
 */
export class RenderPipeline {
  private activeBuffer = new RenderCommandBufferImpl();
  private backBuffer = new RenderCommandBufferImpl();

  /**
   * Swaps the active and back buffers, clearing the old active buffer to prepare it for writing.
   */
  public swapBuffers(): void {
    const temp = this.activeBuffer;
    this.activeBuffer = this.backBuffer;
    this.backBuffer = temp;
    this.backBuffer.clear();
  }

  /**
   * Retrieves the active buffer used strictly for the frontend rendering phase.
   */
  public getActiveBuffer(): RenderCommandBuffer {
    return this.activeBuffer;
  }

  /**
   * Retrieves the back buffer used for recording new rendering commands during logic update.
   */
  public getBackBuffer(): RenderCommandBuffer {
    return this.backBuffer;
  }
}
