import { World, type CoreComponentRegistry } from "@tiny-aster/core";
import { buildHitRunEntitySnapshot } from "./HitRunCanvasVisuals";

describe("HitRun shared entity snapshot projection", () => {
  test("projects transform, elevation, facing, tint and opacity into an immutable snapshot", () => {
    const world = new World<CoreComponentRegistry>();
    const entity = world.createEntity();

    world.addComponent(entity, {
      type: "Transform",
      x: 10,
      y: 20,
      rotation: 0.25,
      scaleX: -1,
      scaleY: 1,
      worldX: 14,
      worldY: 28,
      worldRotation: 0.25,
      worldScaleX: -1,
      worldScaleY: 1,
      dirty: false
    });
    world.addComponent(entity, {
      type: "Render",
      visible: true,
      opacity: 0.8,
      order: 1,
      rotation: 0,
      angularVelocity: 0,
      hitFlashFrames: 3,
      muzzleFlashFrames: 0,
      color: "#c0392b",
      size: 30
    });
    world.addComponent(entity, {
      type: "BeltElevation",
      z: 16,
      vz: 0,
      grounded: false
    });

    const snapshot = buildHitRunEntitySnapshot(world, entity, "player", 24);

    expect(snapshot).toMatchObject({
      entityId: String(entity),
      visualId: "player",
      role: "player",
      transform: {
        x: 14,
        y: 28,
        rotationRadians: 0.25,
        scaleX: -1,
        scaleY: 1
      },
      opacity: 0.8,
      elevation: 16,
      facing: -1,
      hitFlash: 3,
      tint: "#c0392b",
      custom: {
        size: 30,
        depth: 28,
        isDead: false,
        samuraiWindup: false,
        samuraiAttack: false,
        shadowSizeMultiplier: 1
      }
    });
  });

  test("skips entities without visible Render or Transform data", () => {
    const world = new World<CoreComponentRegistry>();
    const entity = world.createEntity();
    world.addComponent(entity, {
      type: "Render",
      visible: false,
      opacity: 1,
      order: 0,
      rotation: 0,
      angularVelocity: 0,
      hitFlashFrames: 0,
      muzzleFlashFrames: 0
    });

    expect(buildHitRunEntitySnapshot(world, entity, "player", 24)).toBeNull();
  });
});
