import { RenderCommand, RenderCommandBuffer } from "./RenderTypes";

/** @public */
export class RenderCommandBufferImpl implements RenderCommandBuffer {
  private commands: RenderCommand[] = [];
  push(command: RenderCommand) { this.commands.push(command); }
  clear() { this.commands = []; }
  getCommands() { return this.commands; }
}
