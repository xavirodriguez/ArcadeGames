import { World } from "../ecs/World";
import { System } from "../ecs/System";
import { ComponentRegistry } from "../ecs/Component";
import { CoreComponentRegistry } from "../ecs/CoreComponents";

/**
 * System that manages coyote time and jump buffering.
 * Decrements timers each frame, sets coyote time when grounded, and triggers buffered landing jumps.
 * @public
 */
export class PlatformerCoyoteSystem<TRegistry extends ComponentRegistry = CoreComponentRegistry> extends System<TRegistry> {
  public update(world: World<TRegistry>, deltaTime: number): void {
    if (world.getResource("IsPaused") === true) return;
    const jumperType = "PlatformerJumper" as Extract<keyof TRegistry, string>;
    const groundStateType = "PlatformerGroundState" as Extract<keyof TRegistry, string>;
    const gravityConfigType = "PlatformerGravityConfig" as Extract<keyof TRegistry, string>;
    const velocityType = "Velocity" as Extract<keyof TRegistry, string>;

    const entities = world.query(jumperType, groundStateType, velocityType, gravityConfigType);
    const len = entities.length;

    for (let i = 0; i < len; i++) {
      const entity = entities[i];
      const groundState = world.getComponent(entity, groundStateType) as CoreComponentRegistry["PlatformerGroundState"] | undefined;
      const jumper = world.getComponent(entity, jumperType) as CoreComponentRegistry["PlatformerJumper"] | undefined;
      const gravityConfig = world.getComponent(entity, gravityConfigType) as CoreComponentRegistry["PlatformerGravityConfig"] | undefined;
      const vel = world.getComponent(entity, velocityType) as CoreComponentRegistry["Velocity"] | undefined;

      if (!groundState || !jumper || !gravityConfig || !vel) continue;

      const isGrounded = groundState.isGrounded;

      // Update timers
      let nextCoyoteTimer = jumper.coyoteTimer;
      let nextJumpBufferTimer = jumper.jumpBufferTimer;

      if (isGrounded) {
        nextCoyoteTimer = jumper.coyoteTimeMax;
      } else {
        nextCoyoteTimer = Math.max(0, nextCoyoteTimer - deltaTime);
      }

      if (nextJumpBufferTimer > 0) {
        nextJumpBufferTimer = Math.max(0, nextJumpBufferTimer - deltaTime);
      }

      // Safe for determinism/rollback. Direct getMutableComponent calls and value-gating eliminate closure allocations and redundant stateVersion increments when timers or grounded states remain identical.
      // Check if we can trigger a buffered jump upon landing
      if (isGrounded && nextJumpBufferTimer > 0) {
        const mutableVel = world.getMutableComponent(entity, velocityType) as CoreComponentRegistry["Velocity"] | undefined;
        if (mutableVel) {
          mutableVel.vy = -gravityConfig.jumpVelocity;
        }

        const mutableGround = world.getMutableComponent(entity, groundStateType) as CoreComponentRegistry["PlatformerGroundState"] | undefined;
        if (mutableGround) {
          mutableGround.isGrounded = false;
        }

        nextJumpBufferTimer = 0;
        nextCoyoteTimer = 0;
      }

      // Write updated timers only when values actually change
      if (jumper.coyoteTimer !== nextCoyoteTimer || jumper.jumpBufferTimer !== nextJumpBufferTimer) {
        const mutableJumper = world.getMutableComponent(entity, jumperType) as CoreComponentRegistry["PlatformerJumper"] | undefined;
        if (mutableJumper) {
          mutableJumper.coyoteTimer = nextCoyoteTimer;
          mutableJumper.jumpBufferTimer = nextJumpBufferTimer;
        }
      }
    }
  }
}
