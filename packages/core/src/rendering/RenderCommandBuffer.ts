import { RenderCommand, RenderCommandBuffer } from "./RenderTypes";

/**
 * In-memory implementation of a render command buffer for accumulating draw operations.
 * Reuses internal arrays to eliminate per-frame garbage collection allocations.
 *
 * @public
 */
export class RenderCommandBufferImpl implements RenderCommandBuffer {
  private commands: RenderCommand[] = [];

  /**
   * Appends a render command to the buffer.
   *
   * @param command - The render command to append.
   */
  public push(command: RenderCommand): void {
    this.commands.push(command);
  }

  /**
   * Resets the command buffer by setting array length to zero.
   */
  public clear(): void {
    // Re-use existing array structure to avoid per-tick garbage collection pressure.
    this.commands.length = 0;
  }

  /**
   * Returns a read-only list of accumulated render commands.
   *
   * @returns Read-only array of render commands.
   */
  public getCommands(): ReadonlyArray<RenderCommand> {
    return this.commands;
  }
}
