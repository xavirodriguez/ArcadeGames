import { World } from "../World";
import { WorldCommandBuffer } from "../WorldCommandBuffer";
import { CoreComponentRegistry } from "../CoreComponents";

describe("WorldCommandBuffer Unit Tests", () => {
  let world: World<CoreComponentRegistry>;
  let commandBuffer: WorldCommandBuffer<CoreComponentRegistry>;

  beforeEach(() => {
    world = new World<CoreComponentRegistry>();
    commandBuffer = new WorldCommandBuffer<CoreComponentRegistry>();
  });

  it("should clear commands pool and prevent orphan commands from re-executing if a command throws during flush", () => {
    // Add command that throws when executed
    commandBuffer.removeEntity(999999); // Throws in dev mode because entity 999999 is not alive

    expect(() => {
      commandBuffer.flush(world);
    }).toThrow();

    // Now call flush again on subsequent tick
    // Verify that NO commands re-execute on the next flush
    // Calling flush again should be a no-op because the pool was cleared in finally block.
    expect(() => commandBuffer.flush(world)).not.toThrow();
  });

  it("should execute remaining commands in the flush batch even if an earlier command throws, and re-throw the first error", () => {
    const executed: string[] = [];

    // Spawn 2 alive entities
    const e1 = world.createEntity();
    const e2 = world.createEntity();

    // Add valid component to e1 using command buffer
    commandBuffer.addComponent(e1, {
      type: "Transform",
      x: 0,
      y: 0,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      worldX: 0,
      worldY: 0,
      worldRotation: 0,
      worldScaleX: 1,
      worldScaleY: 1,
      dirty: false
    });

    // Schedule removing dead entity (throws error)
    commandBuffer.removeEntity(888888);

    // Schedule valid removal of e2 (succeeds)
    commandBuffer.removeEntity(e2);

    expect(() => {
      commandBuffer.flush(world);
    }).toThrow();

    // Verify e1 got component added and e2 was removed
    expect(world.hasComponent(e1, "Transform")).toBe(true);
    expect(world.isAlive(e2)).toBe(false);

    // Verify next flush is completely clean and empty
    expect(() => commandBuffer.flush(world)).not.toThrow();
  });
});
