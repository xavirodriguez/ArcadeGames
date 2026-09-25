import { World } from "../World";
import { WorldCommandBuffer } from "../WorldCommandBuffer";

describe("WorldCommandBuffer Unit Tests", () => {
  let world: World;
  let commandBuffer: WorldCommandBuffer;

  beforeEach(() => {
    world = new World();
    commandBuffer = new WorldCommandBuffer();
  });

  it("should clear commands pool and prevent orphan commands from re-executing if a command throws during flush", () => {
    const executed: string[] = [];

    commandBuffer.addComponent(1, { type: "NonExistent" } as any); // Command 1: may do something or throw

    // Add command that throws
    let secondCmdRan = false;
    commandBuffer.removeEntity(999999); // Command that throws in dev mode because entity 999999 is not alive

    // Add command 3 after the throwing one
    commandBuffer.spawnFromBlueprint("non_existent_blueprint" as any, {} as any);

    // Initial commands count in buffer
    expect(() => {
      commandBuffer.flush(world);
    }).toThrow();

    // Now call flush again on subsequent tick
    // Verify that NO commands re-execute on the next flush
    const mockCmd = jest.fn();
    commandBuffer.flush(world);

    // If commands pool wasn't cleared, the old commands would re-execute or throw again.
    // Calling flush again should be a no-op because the pool was cleared in finally block.
    expect(() => commandBuffer.flush(world)).not.toThrow();
  });

  it("should execute remaining commands in the flush batch even if an earlier command throws, and re-throw the first error", () => {
    const executed: string[] = [];

    // Command 1: succeeds
    const cmd1 = {
      execute: () => {
        executed.push("cmd1");
      }
    };

    // Command 2: throws
    const cmd2 = {
      execute: () => {
        executed.push("cmd2_throws");
        throw new Error("Error in cmd2");
      }
    };

    // Command 3: succeeds
    const cmd3 = {
      execute: () => {
        executed.push("cmd3");
      }
    };

    // Command 4: throws another error
    const cmd4 = {
      execute: () => {
        executed.push("cmd4_throws");
        throw new Error("Error in cmd4");
      }
    };

    // Push commands directly into command buffer using public methods
    commandBuffer.addComponent(1, { type: "Dummy" } as any); // To test public interface
    // Re-assign or test via custom command execution by calling flush
    const customCB = new WorldCommandBuffer();
    (customCB as any).commands.push(cmd1, cmd2, cmd3, cmd4);

    expect(() => {
      customCB.flush(world);
    }).toThrow("Error in cmd2");

    // Check that cmd1, cmd2, cmd3, cmd4 were all attempted/executed in order
    expect(executed).toEqual(["cmd1", "cmd2_throws", "cmd3", "cmd4_throws"]);

    // Verify next flush is completely clean and empty
    executed.length = 0;
    expect(() => customCB.flush(world)).not.toThrow();
    expect(executed).toEqual([]);
  });
});
