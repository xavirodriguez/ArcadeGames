import { World, System, Entity, CoreComponentRegistry, TouchInputState } from "@tiny-aster/core";

/**
 * System that maps game actions to platformer horizontal movement,
 * and handles jump execution, coyote jump, jump buffering triggers,
 * and variable jump height (short hop clamping).
 * @public
 */
export class PlatformerInputSystem extends System<CoreComponentRegistry> {
  private lastJumpStates = new Map<Entity, boolean>();

  public update(world: World<CoreComponentRegistry>, _deltaTime: number): void {
    if (world.getResource("IsPaused") === true) return;
    const inputType = "PlatformerInput";
    const jumperType = "PlatformerJumper";
    const groundStateType = "PlatformerGroundState";
    const gravityConfigType = "PlatformerGravityConfig";
    const velocityType = "Velocity";

    const entities = world.query(inputType, jumperType, groundStateType, gravityConfigType, velocityType);
    const len = entities.length;
    const touchState = world.getResource<TouchInputState>("TouchInputState");

    for (let i = 0; i < len; i++) {
      const entity = entities[i];
      const input = world.getMutableComponent(entity, inputType) as {
        moveDir?: number;
        jumpHeld?: boolean;
        jumpPressed?: boolean;
        jumpReleased?: boolean;
      } | undefined;
      const jumper = world.getMutableComponent(entity, jumperType) as {
        coyoteTimer?: number;
        maxJumps?: number;
        jumpsRemaining?: number;
        jumpBufferTimer?: number;
        jumpBufferMax?: number;
      } | undefined;
      const groundState = world.getMutableComponent(entity, groundStateType) as {
        isGrounded?: boolean;
      } | undefined;
      const gravityConfig = world.getMutableComponent(entity, gravityConfigType) as {
        jumpVelocity: number;
        minJumpVelocity: number;
      } | undefined;
      const vel = world.getMutableComponent(entity, velocityType) as {
        vy: number;
      } | undefined;

      if (!input || !jumper || !groundState || !gravityConfig || !vel) continue;

      if (touchState) {
        if (touchState.moveX < -0.2 || touchState.getButton("moveLeft")) {
          input.moveDir = -1;
        } else if (touchState.moveX > 0.2 || touchState.getButton("moveRight")) {
          input.moveDir = 1;
        } else if (touchState.paddle.active) {
          const transform = world.getComponent(entity, "Transform") as { x: number } | undefined;
          if (transform) {
            if (touchState.paddle.x < transform.x - 5) input.moveDir = -1;
            else if (touchState.paddle.x > transform.x + 5) input.moveDir = 1;
          }
        }

        if (touchState.getButton("jump") || touchState.consumeTaps().length > 0) {
          input.jumpHeld = true;
        }
      }

      const lastJumpState = this.lastJumpStates.get(entity) || false;
      const isJumpHeldNow = input.jumpHeld ?? false;
      const jumpPressed = isJumpHeldNow && !lastJumpState;
      const jumpReleased = !isJumpHeldNow && lastJumpState;
      this.lastJumpStates.set(entity, isJumpHeldNow);

      input.jumpPressed = jumpPressed;
      input.jumpReleased = jumpReleased;

      const isGrounded = groundState.isGrounded ?? false;
      const coyoteTimer = jumper.coyoteTimer ?? 0;

      // Double jump support if power-up or jumper config specifies maxJumps > 1
      const maxJumps = jumper.maxJumps ?? 1;
      const jumpsRemaining = jumper.jumpsRemaining ?? 1;

      // 1. If jump pressed:
      if (jumpPressed) {
        if (isGrounded || coyoteTimer > 0) {
          // Perform normal / coyote jump!
          vel.vy = -gravityConfig.jumpVelocity;
          groundState.isGrounded = false;
          jumper.coyoteTimer = 0;
          jumper.jumpBufferTimer = 0;
          jumper.jumpsRemaining = maxJumps - 1;

          const eventBus = world.getEventBus();
          if (eventBus) {
            eventBus.emit("PlaySFX", { name: "jump" });
          }
        } else if (jumpsRemaining > 0) {
          // Double jump
          vel.vy = -gravityConfig.jumpVelocity;
          jumper.jumpsRemaining = jumpsRemaining - 1;
          jumper.jumpBufferTimer = 0;

          const eventBus = world.getEventBus();
          if (eventBus) {
            eventBus.emit("PlaySFX", { name: "jump" });
          }
        } else {
          // In the air, but no coyote time or double jumps left -> store in jump buffer
          jumper.jumpBufferTimer = jumper.jumpBufferMax ?? 0;
        }
      }

      // Reset jumps remaining on ground
      if (isGrounded) {
        jumper.jumpsRemaining = maxJumps;
      }

      // 2. Variable jump height (short hop):
      if (jumpReleased) {
        if (vel.vy < -gravityConfig.minJumpVelocity) {
          vel.vy = -gravityConfig.minJumpVelocity;
        }
      }
    }
  }
}
