import { World, System, Entity, CoreComponentRegistry } from "@tiny-aster/core";

/**
 * System that maps game actions to platformer horizontal movement,
 * and handles jump execution, coyote jump, jump buffering triggers,
 * and variable jump height (short hop clamping).
 * @public
 */
export class PlatformerInputSystem extends System<CoreComponentRegistry> {
  private lastJumpStates = new Map<Entity, boolean>();

  public update(world: World<CoreComponentRegistry>, deltaTime: number): void {
    if (world.getResource("IsPaused") === true) return;
    const inputType = "PlatformerInput";
    const jumperType = "PlatformerJumper";
    const groundStateType = "PlatformerGroundState";
    const gravityConfigType = "PlatformerGravityConfig";
    const velocityType = "Velocity";

    const entities = world.query(inputType, jumperType, groundStateType, gravityConfigType, velocityType);
    const len = entities.length;

    for (let i = 0; i < len; i++) {
      const entity = entities[i];
      const input = world.getMutableComponent(entity, inputType) as any;
      const jumper = world.getMutableComponent(entity, jumperType) as any;
      const groundState = world.getMutableComponent(entity, groundStateType) as any;
      const gravityConfig = world.getMutableComponent(entity, gravityConfigType) as any;
      const vel = world.getMutableComponent(entity, velocityType) as any;

      if (!input || !jumper || !groundState || !gravityConfig || !vel) continue;

      const lastJumpState = this.lastJumpStates.get(entity) || false;
      const isJumpHeldNow = input.jumpHeld;
      const jumpPressed = isJumpHeldNow && !lastJumpState;
      const jumpReleased = !isJumpHeldNow && lastJumpState;
      this.lastJumpStates.set(entity, isJumpHeldNow);

      input.jumpPressed = jumpPressed;
      input.jumpReleased = jumpReleased;

      const isGrounded = groundState.isGrounded;
      const coyoteTimer = jumper.coyoteTimer;

      // Safe for determinism/rollback. Direct component mutation without mutateComponent callbacks eliminates closure allocations on jump events.
      // 1. If jump pressed:
      if (jumpPressed) {
        if (isGrounded || coyoteTimer > 0) {
          // Perform normal / coyote jump!
          vel.vy = -gravityConfig.jumpVelocity;
          groundState.isGrounded = false;
          jumper.coyoteTimer = 0;
          jumper.jumpBufferTimer = 0;
        } else {
          // In the air, but no coyote time left -> store in jump buffer
          jumper.jumpBufferTimer = jumper.jumpBufferMax;
        }
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
