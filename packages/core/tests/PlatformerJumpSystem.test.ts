import { World, CoreComponentRegistry, PlatformerCoyoteSystem, PlatformerJumpSystem } from "../src";

function createPlayer(world: World<CoreComponentRegistry>, options?: {
  grounded?: boolean;
  maxJumps?: number;
  jumpsRemaining?: number;
  coyoteTimer?: number;
  jumpBufferTimer?: number;
  jumpBufferMax?: number;
}) {
  const entity = world.createEntity();
  world.addComponent(entity, {
    type: "PlatformerInput",
    moveDir: 0,
    jumpPressed: false,
    jumpHeld: false,
    jumpReleased: false
  });
  world.addComponent(entity, {
    type: "PlatformerJumper",
    coyoteTimer: options?.coyoteTimer ?? 0,
    jumpBufferTimer: options?.jumpBufferTimer ?? 0,
    coyoteTimeMax: 0.12,
    jumpBufferMax: options?.jumpBufferMax ?? 0.12,
    maxJumps: options?.maxJumps ?? 1,
    jumpsRemaining: options?.jumpsRemaining ?? options?.maxJumps ?? 1
  });
  world.addComponent(entity, {
    type: "PlatformerGroundState",
    isGrounded: options?.grounded ?? true
  });
  world.addComponent(entity, {
    type: "PlatformerGravityConfig",
    riseGravity: 900,
    fallGravity: 1200,
    jumpVelocity: 360,
    minJumpVelocity: 140
  });
  world.addComponent(entity, {
    type: "Velocity",
    vx: 0,
    vy: 0,
    angularVelocity: 0
  });
  return entity;
}

describe("PlatformerJumpSystem", () => {
  it("applies a grounded jump once and clamps velocity on early release", () => {
    const world = new World<CoreComponentRegistry>();
    const entity = createPlayer(world);
    const jump = new PlatformerJumpSystem();

    world.mutateComponent(entity, "PlatformerInput", input => {
      input.jumpPressed = true;
    });
    jump.update(world, 1 / 60);

    expect(world.getComponent(entity, "Velocity")!.vy).toBe(-360);
    expect(world.getComponent(entity, "PlatformerGroundState")!.isGrounded).toBe(false);
    expect(world.getComponent(entity, "PlatformerJumper")!.jumpsRemaining).toBe(0);

    world.mutateComponent(entity, "PlatformerInput", input => {
      input.jumpPressed = false;
      input.jumpReleased = true;
    });
    jump.update(world, 1 / 60);
    expect(world.getComponent(entity, "Velocity")!.vy).toBe(-140);
  });

  it("supports coyote jump and consumes a buffered jump on landing", () => {
    const world = new World<CoreComponentRegistry>();
    const coyote = new PlatformerCoyoteSystem();
    const jump = new PlatformerJumpSystem();
    const entity = createPlayer(world, {
      grounded: false,
      jumpsRemaining: 0,
      coyoteTimer: 0.08
    });

    world.mutateComponent(entity, "PlatformerInput", input => {
      input.jumpPressed = true;
    });
    coyote.update(world, 1 / 60);
    jump.update(world, 1 / 60);
    expect(world.getComponent(entity, "Velocity")!.vy).toBe(-360);
    expect(world.getComponent(entity, "PlatformerJumper")!.coyoteTimer).toBe(0);

    // No jumps remain: a new request is buffered until the next landing.
    world.mutateComponent(entity, "PlatformerInput", input => {
      input.jumpPressed = true;
      input.jumpReleased = false;
    });
    jump.update(world, 1 / 60);
    expect(world.getComponent(entity, "PlatformerJumper")!.jumpBufferTimer).toBe(0.12);

    world.mutateComponent(entity, "PlatformerInput", input => {
      input.jumpPressed = false;
    });
    world.mutateComponent(entity, "PlatformerGroundState", ground => {
      ground.isGrounded = true;
    });
    coyote.update(world, 1 / 60);
    jump.update(world, 1 / 60);

    expect(world.getComponent(entity, "Velocity")!.vy).toBe(-360);
    expect(world.getComponent(entity, "PlatformerGroundState")!.isGrounded).toBe(false);
    expect(world.getComponent(entity, "PlatformerJumper")!.jumpBufferTimer).toBe(0);
  });

  it("preserves configured double jump and rejects an exhausted extra jump", () => {
    const world = new World<CoreComponentRegistry>();
    const entity = createPlayer(world, { maxJumps: 2 });
    const jump = new PlatformerJumpSystem();

    world.mutateComponent(entity, "PlatformerInput", input => {
      input.jumpPressed = true;
    });
    jump.update(world, 1 / 60);
    expect(world.getComponent(entity, "PlatformerJumper")!.jumpsRemaining).toBe(1);

    world.mutateComponent(entity, "PlatformerInput", input => {
      input.jumpPressed = true;
    });
    jump.update(world, 1 / 60);
    expect(world.getComponent(entity, "PlatformerJumper")!.jumpsRemaining).toBe(0);

    world.mutateComponent(entity, "Velocity", velocity => {
      velocity.vy = -250;
    });
    world.mutateComponent(entity, "PlatformerInput", input => {
      input.jumpPressed = true;
    });
    jump.update(world, 1 / 60);
    expect(world.getComponent(entity, "Velocity")!.vy).toBe(-250);
  });
});
