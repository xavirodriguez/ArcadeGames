import { World, CoreComponentRegistry, TouchInputState } from "@tiny-aster/core";
import { PlatformerInputSystem } from "../PlatformerInputSystem";

describe("PlatformerInputSystem deterministic jump edges", () => {
  it("aggregates touch slide input and clears it when the touch button is released", () => {
    const world = new World<CoreComponentRegistry>();
    const entity = world.createEntity();
    const touch = new TouchInputState();
    world.setResource("TouchInputState", touch);
    world.addComponent(entity, {
      type: "PlatformerInput",
      moveDir: 0,
      jumpPressed: false,
      jumpHeld: false,
      jumpReleased: false,
      slideActionHeld: false
    });

    touch.setButton("slide", true);
    new PlatformerInputSystem().update(world, 1 / 60);
    expect(world.getComponent(entity, "PlatformerInput")?.slideHeld).toBe(true);

    touch.setButton("slide", false);
    new PlatformerInputSystem().update(world, 1 / 60);
    expect(world.getComponent(entity, "PlatformerInput")?.slideHeld).toBe(false);
  });

  it("aggregates touch brake input and clears it when released", () => {
    const world = new World<CoreComponentRegistry>();
    const entity = world.createEntity();
    const touch = new TouchInputState();
    world.setResource("TouchInputState", touch);
    world.addComponent(entity, {
      type: "PlatformerInput",
      moveDir: 0,
      jumpPressed: false,
      jumpHeld: false,
      jumpReleased: false,
      brakeActionHeld: false
    });

    touch.setButton("brake", true);
    new PlatformerInputSystem().update(world, 1 / 60);
    expect(world.getComponent(entity, "PlatformerInput")?.brake).toBe(true);

    touch.setButton("brake", false);
    new PlatformerInputSystem().update(world, 1 / 60);
    expect(world.getComponent(entity, "PlatformerInput")?.brake).toBe(false);
  });

  it("keeps held-button edge history across system recreation", () => {
    const world = new World<CoreComponentRegistry>();
    const entity = world.createEntity();

    world.addComponent(entity, {
      type: "PlatformerInput",
      moveDir: 0,
      jumpPressed: false,
      jumpHeld: true,
      jumpReleased: false
    });
    world.addComponent(entity, {
      type: "PlatformerJumper",
      coyoteTimer: 0,
      jumpBufferTimer: 0,
      coyoteTimeMax: 0.15,
      jumpBufferMax: 0.1,
      maxJumps: 1,
      jumpsRemaining: 1
    });
    world.addComponent(entity, {
      type: "PlatformerGroundState",
      isGrounded: true
    });
    world.addComponent(entity, {
      type: "PlatformerGravityConfig",
      riseGravity: 500,
      fallGravity: 1000,
      jumpVelocity: 300,
      minJumpVelocity: 100
    });
    world.addComponent(entity, {
      type: "Velocity",
      vx: 0,
      vy: 0,
      angularVelocity: 0
    });

    new PlatformerInputSystem().update(world, 1 / 60);
    let input = world.getComponent(entity, "PlatformerInput")!;
    expect(input.jumpPressed).toBe(true);
    expect(input.previousJumpHeld).toBe(true);

    // Recreating the system must not turn a held button into a second press.
    new PlatformerInputSystem().update(world, 1 / 60);
    input = world.getComponent(entity, "PlatformerInput")!;
    expect(input.jumpPressed).toBe(false);
    expect(input.jumpReleased).toBe(false);

    world.mutateComponent(entity, "PlatformerInput", (current) => {
      current.jumpHeld = false;
    });
    new PlatformerInputSystem().update(world, 1 / 60);
    input = world.getComponent(entity, "PlatformerInput")!;
    expect(input.jumpPressed).toBe(false);
    expect(input.jumpReleased).toBe(true);
    expect(input.previousJumpHeld).toBe(false);
  });
});
