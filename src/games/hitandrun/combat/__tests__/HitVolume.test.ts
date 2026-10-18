import { World, CoreComponentRegistry } from "@tiny-aster/core";
import { depthZOverlap } from "../HitVolume";

function addTransform(
  world: World<CoreComponentRegistry>,
  entity: number,
  x: number,
  y: number
): void {
  world.addComponent(entity, {
    type: "Transform",
    x,
    y,
    worldX: x,
    worldY: y,
    rotation: 0,
    worldRotation: 0,
    scaleX: 1,
    scaleY: 1,
    worldScaleX: 1,
    worldScaleY: 1,
    dirty: false
  });
}

describe("HitVolume depthZOverlap", () => {
  let world: World<CoreComponentRegistry>;

  beforeEach(() => {
    world = new World<CoreComponentRegistry>();
  });

  it("returns true when attacker and target are on same depth line and ground height", () => {
    const attacker = world.createEntity();
    addTransform(world, attacker, 100, 350);
    world.addComponent(attacker, { type: "BeltElevation", z: 0, vz: 0, grounded: true });

    const target = world.createEntity();
    addTransform(world, target, 120, 355);
    world.addComponent(target, { type: "BeltElevation", z: 0, vz: 0, grounded: true });

    expect(depthZOverlap(attacker, target, world, { halfDepth: 20 })).toBe(true);
  });

  it("returns false when target is too far in depth (|dy| > halfDepth)", () => {
    const attacker = world.createEntity();
    addTransform(world, attacker, 100, 300);

    const target = world.createEntity();
    addTransform(world, target, 100, 350); // dy = 50 > halfDepth 20

    expect(depthZOverlap(attacker, target, world, { halfDepth: 20 })).toBe(false);
  });

  it("returns true at exact halfDepth boundary", () => {
    const attacker = world.createEntity();
    addTransform(world, attacker, 100, 400);
    world.addComponent(attacker, { type: "BeltElevation", z: 0, vz: 0, grounded: true });

    const target = world.createEntity();
    addTransform(world, target, 100, 420); // dy = 20 === halfDepth
    world.addComponent(target, { type: "BeltElevation", z: 0, vz: 0, grounded: true });

    expect(depthZOverlap(attacker, target, world, { halfDepth: 20 })).toBe(true);
  });

  it("returns false when target is jumping high above low attack height range", () => {
    const attacker = world.createEntity();
    addTransform(world, attacker, 100, 350);
    world.addComponent(attacker, { type: "BeltElevation", z: 0, vz: 0, grounded: true });

    const target = world.createEntity();
    addTransform(world, target, 100, 350);
    world.addComponent(target, { type: "BeltElevation", z: 80, vz: 0, grounded: false });

    expect(
      depthZOverlap(attacker, target, world, {
        halfDepth: 20,
        attackerZHeight: 20,
        targetZHeight: 24
      })
    ).toBe(false);
  });
});
