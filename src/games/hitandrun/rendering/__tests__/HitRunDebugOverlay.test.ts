import { World, CoreComponentRegistry } from "@tiny-aster/core";
import {
  drawHitRunDebugOverlay,
  HIT_RUN_DEBUG_OVERLAY_RESOURCE
} from "../HitRunDebugOverlay";

describe("HitRunDebugOverlay", () => {
  let world: World<CoreComponentRegistry>;
  let ctx: CanvasRenderingContext2D;

  beforeEach(() => {
    world = new World<CoreComponentRegistry>();
    ctx = {
      save: jest.fn(),
      restore: jest.fn(),
      beginPath: jest.fn(),
      moveTo: jest.fn(),
      lineTo: jest.fn(),
      stroke: jest.fn(),
      arc: jest.fn(),
      fill: jest.fn(),
      fillText: jest.fn(),
      fillRect: jest.fn(),
      strokeRect: jest.fn(),
      setLineDash: jest.fn()
    } as unknown as CanvasRenderingContext2D;
  });

  it("does nothing if debug overlay resource is not enabled", () => {
    drawHitRunDebugOverlay.draw(ctx, world);
    expect(ctx.save).not.toHaveBeenCalled();
  });

  it("draws depth boundary lines and entity gizmos when enabled", () => {
    world.setResource(HIT_RUN_DEBUG_OVERLAY_RESOURCE, true);

    const entity = world.createEntity();
    world.addComponent(entity, {
      type: "Transform",
      x: 100,
      y: 350,
      worldX: 100,
      worldY: 350,
      rotation: 0,
      worldRotation: 0,
      scaleX: 1,
      scaleY: 1,
      worldScaleX: 1,
      worldScaleY: 1,
      dirty: false
    });
    world.addComponent(entity, {
      type: "BeltElevation",
      z: 20,
      vz: 0,
      grounded: false
    });
    world.addComponent(entity, {
      type: "Collider2D",
      shape: { type: "aabb", halfWidth: 10, halfHeight: 15 },
      layer: 1,
      mask: 0xffff,
      offsetX: 0,
      offsetY: 0,
      isTrigger: false,
      enabled: true
    });

    drawHitRunDebugOverlay.draw(ctx, world);

    expect(ctx.save).toHaveBeenCalled();
    expect(ctx.fillText).toHaveBeenCalledWith("depthMin: 280", expect.any(Number), expect.any(Number));
    expect(ctx.fillText).toHaveBeenCalledWith("depthMax: 520", expect.any(Number), expect.any(Number));
    expect(ctx.fillText).toHaveBeenCalledWith("y:350 z:20", expect.any(Number), expect.any(Number));
    expect(ctx.restore).toHaveBeenCalled();
  });
});
