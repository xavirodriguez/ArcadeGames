import { World, CoreComponentRegistry } from "../src/index";
import { CanvasRenderer } from "../../renderer-canvas/src/CanvasRenderer";

describe("CanvasRenderer Y-sorting (depthSort)", () => {
  it("sorts entities with same order by worldY/y ascending when depthSort is true", () => {
    const world = new World<CoreComponentRegistry>();
    const renderer = new CanvasRenderer();

    // Entity A: y = 500, order = 2, depthSort = true
    const entityA = world.createEntity();
    world.addComponent(entityA, {
      type: "Transform",
      x: 100,
      y: 500,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      worldX: 100,
      worldY: 500,
      worldRotation: 0,
      worldScaleX: 1,
      worldScaleY: 1,
      dirty: false
    });
    world.addComponent(entityA, {
      type: "Render",
      visible: true,
      opacity: 1,
      order: 2,
      depthSort: true,
      rotation: 0,
      angularVelocity: 0,
      hitFlashFrames: 0,
      shape: "test_A"
    });

    // Entity B: y = 300, order = 2, depthSort = true
    const entityB = world.createEntity();
    world.addComponent(entityB, {
      type: "Transform",
      x: 100,
      y: 300,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      worldX: 100,
      worldY: 300,
      worldRotation: 0,
      worldScaleX: 1,
      worldScaleY: 1,
      dirty: false
    });
    world.addComponent(entityB, {
      type: "Render",
      visible: true,
      opacity: 1,
      order: 2,
      depthSort: true,
      rotation: 0,
      angularVelocity: 0,
      hitFlashFrames: 0,
      shape: "test_B"
    });

    const drawOrder: string[] = [];
    renderer.registerShape("test_A", {
      draw: () => { drawOrder.push("test_A"); }
    });
    renderer.registerShape("test_B", {
      draw: () => { drawOrder.push("test_B"); }
    });

    const ctx = {
      canvas: { width: 800, height: 600 },
      fillStyle: "",
      strokeStyle: "",
      globalAlpha: 1,
      fillRect: () => {},
      save: () => {},
      restore: () => {},
      translate: () => {},
      scale: () => {},
      rotate: () => {},
      beginPath: () => {},
      rect: () => {},
      clip: () => {}
    } as unknown as CanvasRenderingContext2D;

    renderer.render(world, ctx);

    // Entity B (y = 300) must be drawn BEFORE Entity A (y = 500)
    expect(drawOrder).toEqual(["test_B", "test_A"]);
  });

  it("does not change sort order for entities without depthSort", () => {
    const world = new World<CoreComponentRegistry>();
    const renderer = new CanvasRenderer();

    const entityA = world.createEntity();
    world.addComponent(entityA, {
      type: "Transform", x: 100, y: 500, rotation: 0, scaleX: 1, scaleY: 1, worldX: 100, worldY: 500, worldRotation: 0, worldScaleX: 1, worldScaleY: 1, dirty: false
    });
    world.addComponent(entityA, {
      type: "Render", visible: true, opacity: 1, order: 2, rotation: 0, angularVelocity: 0, hitFlashFrames: 0, shape: "test_A"
    });

    const entityB = world.createEntity();
    world.addComponent(entityB, {
      type: "Transform", x: 100, y: 300, rotation: 0, scaleX: 1, scaleY: 1, worldX: 100, worldY: 300, worldRotation: 0, worldScaleX: 1, worldScaleY: 1, dirty: false
    });
    world.addComponent(entityB, {
      type: "Render", visible: true, opacity: 1, order: 2, rotation: 0, angularVelocity: 0, hitFlashFrames: 0, shape: "test_B"
    });

    const drawOrder: string[] = [];
    renderer.registerShape("test_A", { draw: () => { drawOrder.push("test_A"); } });
    renderer.registerShape("test_B", { draw: () => { drawOrder.push("test_B"); } });

    const ctx = {
      canvas: { width: 800, height: 600 },
      fillStyle: "", strokeStyle: "", globalAlpha: 1,
      fillRect: () => {}, save: () => {}, restore: () => {}, translate: () => {}, scale: () => {}, rotate: () => {}, beginPath: () => {}, rect: () => {}, clip: () => {}
    } as unknown as CanvasRenderingContext2D;

    renderer.render(world, ctx);

    // Since depthSort is false, insertion/query order is preserved: test_A then test_B
    expect(drawOrder).toEqual(["test_A", "test_B"]);
  });
});
