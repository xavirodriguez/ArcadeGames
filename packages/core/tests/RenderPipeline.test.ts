import { RenderPipeline } from "../src/rendering/RenderPipeline";
import { RenderCommandType } from "../src/rendering/RenderTypes";

describe("RenderPipeline Double Buffering Pattern", () => {
  it("should write to back buffer, swap cleanly to active buffer, and clear the writing buffer", () => {
    const pipeline = new RenderPipeline();

    const active = pipeline.getActiveBuffer();
    const back = pipeline.getBackBuffer();

    expect(active.getCommands().length).toBe(0);
    expect(back.getCommands().length).toBe(0);

    // 1. Write commands to back buffer
    back.push({
      type: RenderCommandType.DrawCircle,
      data: { x: 100, y: 100, radius: 10, color: "red" }
    });

    expect(pipeline.getActiveBuffer().getCommands().length).toBe(0);
    expect(pipeline.getBackBuffer().getCommands().length).toBe(1);

    // 2. Swap buffers
    pipeline.swapBuffers();

    // The command is now active for rendering
    expect(pipeline.getActiveBuffer().getCommands().length).toBe(1);
    expect(pipeline.getActiveBuffer().getCommands()[0].data.color).toBe("red");

    // The new back buffer has been cleared for the next write cycle
    expect(pipeline.getBackBuffer().getCommands().length).toBe(0);
  });
});
