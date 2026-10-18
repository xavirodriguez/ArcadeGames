import { World, CoreComponentRegistry } from "@tiny-aster/core";
import { BeltMovementSystem } from "../BeltMovementSystem";
import {
  createBeltInputComponent,
  createBeltMovementComponent,
  BELT_MOVEMENT_CONFIG_RESOURCE,
  DEFAULT_BELT_MOVEMENT_CONFIG
} from "../BeltMovementTypes";

describe("BeltMovementSystem depth axis", () => {
  function setup() {
    const world = new World<CoreComponentRegistry>();
    world.setResource(BELT_MOVEMENT_CONFIG_RESOURCE, {
      ...DEFAULT_BELT_MOVEMENT_CONFIG,
      maxSpeedY: 200,
      acceleration: 5000,
      deceleration: 5000,
      depthMin: 280,
      depthMax: 520
    });

    const entity = world.createEntity();
    world.addComponent(entity, {
      type: "Transform",
      x: 120,
      y: 400,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      worldX: 120,
      worldY: 400,
      worldRotation: 0,
      worldScaleX: 1,
      worldScaleY: 1,
      dirty: false
    });
    world.addComponent(entity, { type: "Velocity", vx: 0, vy: 0, angularVelocity: 0 });
    world.addComponent(entity, createBeltInputComponent());
    world.addComponent(entity, createBeltMovementComponent());

    const system = new BeltMovementSystem();
    return { world, entity, system };
  }

  it("moveY +1 increases Transform.y (deeper into the belt)", () => {
    const { world, entity, system } = setup();
    world.mutateComponent(entity, "BeltInput", (c) => {
      c.moveY = 1;
    });

    const y0 = world.getComponent(entity, "Transform")!.y;
    for (let i = 0; i < 10; i++) {
      system.update(world, 1 / 60);
      // Integrate velocity into transform (belt system only sets vel.vy;
      // platformer integration may apply elsewhere — apply here for unit isolation)
      const vel = world.getMutableComponent(entity, "Velocity") as { vy: number };
      const t = world.getMutableComponent(entity, "Transform") as {
        y: number;
        worldY?: number;
      };
      t.y += vel.vy * (1 / 60);
      if (t.worldY !== undefined) t.worldY = t.y;
    }

    const y1 = world.getComponent(entity, "Transform")!.y;
    expect(y1).toBeGreaterThan(y0);
  });

  it("moveY -1 decreases Transform.y (toward camera)", () => {
    const { world, entity, system } = setup();
    world.mutateComponent(entity, "BeltInput", (c) => {
      c.moveY = -1;
    });

    const y0 = world.getComponent(entity, "Transform")!.y;
    for (let i = 0; i < 10; i++) {
      system.update(world, 1 / 60);
      const vel = world.getMutableComponent(entity, "Velocity") as { vy: number };
      const t = world.getMutableComponent(entity, "Transform") as {
        y: number;
        worldY?: number;
      };
      t.y += vel.vy * (1 / 60);
      if (t.worldY !== undefined) t.worldY = t.y;
    }

    const y1 = world.getComponent(entity, "Transform")!.y;
    expect(y1).toBeLessThan(y0);
  });

  it("clamps Transform.y to [depthMin, depthMax]", () => {
    const { world, entity, system } = setup();
    const t = world.getMutableComponent(entity, "Transform") as {
      y: number;
      worldY?: number;
    };
    t.y = 600;
    t.worldY = 600;

    system.update(world, 1 / 60);

    expect(t.y).toBe(520);

    t.y = 100;
    t.worldY = 100;
    system.update(world, 1 / 60);
    expect(t.y).toBe(280);
  });

  it("sets vel.vy toward maxSpeedY * moveY", () => {
    const { world, entity, system } = setup();
    world.mutateComponent(entity, "BeltInput", (c) => {
      c.moveY = 1;
    });

    for (let i = 0; i < 30; i++) {
      system.update(world, 1 / 60);
    }

    const vel = world.getComponent(entity, "Velocity") as { vy: number };
    expect(vel.vy).toBeGreaterThan(100);
    expect(vel.vy).toBeLessThanOrEqual(200 + 1e-3);
  });
});
