import { World, CoreComponentRegistry, enterGameplayFreeze } from "@tiny-aster/core";
import { registerBeltSystems } from "../belt/registerBeltSystems";

describe("Hit&Run GameplayFreeze", () => {
  it("keeps player Transform.x unchanged during hit-stop", () => {
    const world = new World<CoreComponentRegistry>();
    registerBeltSystems(world);

    const player = world.createEntity();
    world.addComponent(player, {
      type: "Transform",
      x: 120,
      y: 400,
      worldX: 120,
      worldY: 400,
      rotation: 0,
      worldRotation: 0,
      scaleX: 1,
      scaleY: 1,
      worldScaleX: 1,
      worldScaleY: 1,
      dirty: true
    });
    world.addComponent(player, {
      type: "Velocity",
      vx: 900,
      vy: 0,
      angularVelocity: 0
    });

    enterGameplayFreeze(world, 0.2);
    world.update(1 / 60);

    const transform = world.getComponent(player, "Transform");
    expect(transform?.x).toBe(120);
    expect(world.getResource("HitStopRemaining")).toBeUndefined();
    expect(world.getResource("GameplayFreeze")).toBeDefined();
  });
});
