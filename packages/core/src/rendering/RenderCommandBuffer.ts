import { RenderCommand, RenderCommandBuffer } from "./RenderTypes";

/** @public */
export class RenderCommandBufferImpl implements RenderCommandBuffer {
  private commands: RenderCommand[] = [];
  push(command: RenderCommand) { this.commands.push(command); }
  clear() {
    // Re-use existing array structure to avoid per-tick garbage collection pressure.
    this.commands.length = 0;
  }
  getCommands() { return this.commands; }
}
