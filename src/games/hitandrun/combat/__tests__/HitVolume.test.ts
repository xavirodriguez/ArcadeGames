import { World, CoreComponentRegistry } from "@tiny-aster/core";
import { depthZOverlap } from "../HitVolume";

describe("HitVolume depthZOverlap", () => {
  let world: World<CoreComponentRegistry>;

  beforeEach(() => {
    world = new World<CoreComponentRegistry>();
  });

  it("returns true when attacker and target are on same depth line and ground height", () => {
    const attacker = world.createEntity();
    world.addComponent(attacker, {
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
    world.addComponent(attacker, { type: "BeltElevation", z: 0, vz: 0, grounded: true });

    const target = world.createEntity();
    world.addComponent(target, {
      type: "Transform",
      x: 120,
      y: 355,
      worldX: 120,
      worldY: 355,
      rotation: 0,
      worldRotation: 0,
      scaleX: 1,
      scaleY: 1,
      worldScaleX: 1,
      worldScaleY: 1,
      dirty: false
    });
    world.addComponent(target, { type: "BeltElevation", z: 0, vz: 0, grounded: true });

    expect(depthZOverlap(attacker, target, world, { halfDepth: 20 })).toBe(true);
  });

  it("returns false when target is too far in depth (|dy| > halfDepth)", () => {
    const attacker = world.createEntity();
    world.addComponent(attacker, {
      type: "Transform",
      x: 100,
      y: 300,
      worldX: 100,
      worldY: 300,
      rotation: 0,
      worldRotation: 0,
      scaleX: 1,
      scaleY: 1,
      worldScaleX: 1,
      worldScaleY: 1,
      dirty: false
    });

    const target = world.createEntity();
    world.addComponent(target, {
      type: "Transform",
      x: 100,
      y: 350, // dy = 50 > halfDepth 20
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

    expect(depthZOverlap(attacker, target, world, { halfDepth: 20 })).toBe(false);
  });

  it("returns false when target is jumping high above low attack height range", () => {
    const attacker = world.createEntity();
    world.addComponent(attacker, {
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
    world.addComponent(attacker, { type: "BeltElevation", z: 0, vz: 0, grounded: true }); // Z: 0..20

    const target = world.createEntity();
    world.addComponent(target, {
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
    world.addComponent(target, { type: "BeltElevation", z: 80, vz: 0, grounded: false }); // Z: 80..104

    expect(
      depthZOverlap(attacker, target, world, { halfDepth: 20, attackerZHeight: 20, targetZHeight: 24 })
    ).toBe(false);
  });
});
