import { World, CoreComponentRegistry } from "@tiny-aster/core";
import { storePreviousTransforms, getInterpolatedPosition } from "../rendering/HitRunRenderInterpolation";

describe("M10: Render interpolation with alpha and previous transforms", () => {
  it("stores previous transform and interpolates position based on alpha", () => {
    const world = new World<CoreComponentRegistry>();

    const player = world.createEntity();
    world.addComponent(player, {
      type: "Transform",
      x: 100,
      y: 100,
      worldX: 100,
      worldY: 100,
      rotation: 0,
      worldRotation: 0,
      scaleX: 1,
      scaleY: 1,
      worldScaleX: 1,
      worldScaleY: 1,
      dirty: true
    });

    // Store previous transform at (100, 100)
    storePreviousTransforms(world);

    // Mutate position to (200, 100)
    world.mutateComponent(player, "Transform", (t: { x: number; worldX?: number }) => {
      t.x = 200;
      t.worldX = 200;
    });

    // At alpha = 0.5, interpolated position should be halfway at 150
    const posHalf = getInterpolatedPosition(world, player, 0.5);
    expect(posHalf.x).toBe(150);

    // At alpha = 1.0, interpolated position should be 200
    const posFull = getInterpolatedPosition(world, player, 1.0);
    expect(posFull.x).toBe(200);
  });
});
