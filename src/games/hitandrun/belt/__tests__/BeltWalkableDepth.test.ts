import { World, CoreComponentRegistry } from "@tiny-aster/core";
import {
  BELT_MOVEMENT_CONFIG_RESOURCE,
  DEFAULT_BELT_MOVEMENT_CONFIG
} from "../BeltMovementTypes";
import { BeltMovementSystem } from "../BeltMovementSystem";
import { registerBeltSystems } from "../registerBeltSystems";
import { resolveBeltMovementConfigForLevel } from "../BeltWalkableDepth";

describe("Hit & Run level walkable depth", () => {
  it("uses the level declaration instead of the legacy depth defaults", () => {
    const config = resolveBeltMovementConfigForLevel({
      walkableDepth: { min: 312, max: 468 }
    });

    expect(config.depthMin).toBe(312);
    expect(config.depthMax).toBe(468);
    expect(DEFAULT_BELT_MOVEMENT_CONFIG.depthMin).toBe(280);
    expect(DEFAULT_BELT_MOVEMENT_CONFIG.depthMax).toBe(520);
  });

  it("preserves unrelated movement tuning when applying the level band", () => {
    const config = resolveBeltMovementConfigForLevel(
      { walkableDepth: { min: 300, max: 490 } },
      { ...DEFAULT_BELT_MOVEMENT_CONFIG, maxSpeedY: 175 }
    );

    expect(config).toMatchObject({
      maxSpeedY: 175,
      depthMin: 300,
      depthMax: 490
    });
  });

  it("keeps legacy defaults for level definitions without a walkable band", () => {
    expect(resolveBeltMovementConfigForLevel({})).toEqual(
      DEFAULT_BELT_MOVEMENT_CONFIG
    );
  });

  it.each([
    { min: 300, max: 300 },
    { min: 400, max: 300 },
    { min: Number.NaN, max: 500 },
    { min: 250, max: Number.POSITIVE_INFINITY }
  ])("rejects invalid level bounds: %o", (walkableDepth) => {
    expect(() => resolveBeltMovementConfigForLevel({ walkableDepth })).toThrow(
      RangeError
    );
  });

  it("registers and clamps movement against the level-resolved band", () => {
    const world = new World<CoreComponentRegistry>();
    const movement = resolveBeltMovementConfigForLevel({
      walkableDepth: { min: 315, max: 465 }
    });
    registerBeltSystems(world, { movement });

    const entity = world.createEntity();
    world.addComponent(entity, {
      type: "Transform",
      x: 120,
      y: 500,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      worldX: 120,
      worldY: 500,
      worldRotation: 0,
      worldScaleX: 1,
      worldScaleY: 1,
      dirty: false
    });
    world.addComponent(entity, {
      type: "Velocity",
      vx: 0,
      vy: 0,
      angularVelocity: 0
    });
    world.addComponent(entity, {
      type: "BeltInput",
      moveX: 0,
      moveY: 0,
      aimX: 0,
      aimY: 0,
      attackHeld: false,
      attackPressed: false,
      fireHeld: false,
      firePressed: false,
      specialHeld: false,
      specialPressed: false,
      guardHeld: false,
      jumpHeld: false,
      jumpPressed: false,
      _prevHeldMask: 0
    });
    world.addComponent(entity, {
      type: "BeltMovement",
      facing: 1,
      isHopping: false,
      hopElapsed: 0,
      groundY: 400
    });

    expect(
      world.getResource<typeof movement>(BELT_MOVEMENT_CONFIG_RESOURCE)
    ).toMatchObject({ depthMin: 315, depthMax: 465 });

    new BeltMovementSystem().update(world, 1 / 60);

    expect(world.getComponent(entity, "Transform")?.y).toBe(465);
  });
});
