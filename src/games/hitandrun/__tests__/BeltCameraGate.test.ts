import { World, CoreComponentRegistry } from "@tiny-aster/core";
import { BeltCameraSystem } from "../belt/BeltCameraSystem";
import { BELT_CAMERA_STATE_RESOURCE, BeltCameraState } from "../belt/BeltCameraTypes";

describe("M8: Dedicated BeltSectionEnemy gate locking", () => {
  it("an enemy without Render component still locks the camera gate and unlocks upon death", () => {
    const world = new World<CoreComponentRegistry>();
    const cameraSys = new BeltCameraSystem();

    const enemy = world.createEntity();
    world.addComponent(enemy, {
      type: "Enemy",
      kind: "patrol"
    });
    world.addComponent(enemy, {
      type: "BeltSectionEnemy",
      sectionIndex: 0
    });
    world.addComponent(enemy, {
      type: "Health",
      current: 5,
      max: 5
    });

    // Run camera system update
    cameraSys.update(world, 0.016);

    let cameraState = world.getResource<BeltCameraState>(BELT_CAMERA_STATE_RESOURCE);
    expect(cameraState?.gateLocked).toBe(true);

    // Kill enemy
    world.mutateComponent(enemy, "Health", (h: { current: number }) => {
      h.current = 0;
    });
    world.addComponent(enemy, { type: "Dead" });

    cameraSys.update(world, 0.016);

    cameraState = world.getResource<BeltCameraState>(BELT_CAMERA_STATE_RESOURCE);
    expect(cameraState?.sectionCleared).toBe(true);
    expect(cameraState?.gateLocked).toBe(false);
  });
});
