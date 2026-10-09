import { World, CoreComponentRegistry } from "@tiny-aster/core";
import {
  BeltMovementSystem,
  createBeltInputComponent,
  createBeltMovementComponent,
  createBeltElevationComponent,
  depthT
} from "../index";

describe("BeltElevation and Depth Model", () => {
  it("depthT clamps values correctly between depthMin and depthMax", () => {
    expect(depthT(280, 280, 520)).toBe(0);
    expect(depthT(520, 280, 520)).toBe(1);
    expect(depthT(400, 280, 520)).toBeCloseTo(0.5);
    expect(depthT(100, 280, 520)).toBe(0);
    expect(depthT(600, 280, 520)).toBe(1);
  });

  it("hop integrates elevation.z without altering Transform.y", () => {
    const world = new World<CoreComponentRegistry>();
    const movementSystem = new BeltMovementSystem();

    const entity = world.createEntity();
    world.addComponent(entity, {
      type: "Transform",
      x: 100,
      y: 350,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      worldX: 100,
      worldY: 350,
      worldRotation: 0,
      worldScaleX: 1,
      worldScaleY: 1,
      dirty: false
    });
    world.addComponent(entity, { type: "Velocity", vx: 0, vy: 0, angularVelocity: 0 });

    const input = createBeltInputComponent();
    input.jumpPressed = true;
    world.addComponent(entity, input);

    world.addComponent(entity, createBeltMovementComponent());
    world.addComponent(entity, createBeltElevationComponent());

    const initialY = 350;

    // Tick 1: trigger jump
    movementSystem.update(world, 0.016);
    world.mutateComponent(entity, "BeltInput", (c) => {
      c.jumpPressed = false;
    });

    const transform = world.getComponent(entity, "Transform")!;
    const elevation = world.getComponent(entity, "BeltElevation")!;

    expect(transform.y).toBe(initialY); // Transform.y MUST stay on ground line
    expect(elevation.z).toBeGreaterThan(0);
    expect(elevation.grounded).toBe(false);

    // Simulate airborne frames until landing
    for (let i = 0; i < 40; i++) {
      movementSystem.update(world, 0.016);
      expect(transform.y).toBe(initialY); // Transform.y MUST NEVER change from hop
    }

    const finalElevation = world.getComponent(entity, "BeltElevation")!;
    expect(transform.y).toBe(initialY);
    expect(finalElevation.z).toBe(0);
    expect(finalElevation.grounded).toBe(true);
  });
});
