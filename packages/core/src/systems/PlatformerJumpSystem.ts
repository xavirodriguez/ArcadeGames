import { World } from "../ecs/World";
import { System } from "../ecs/System";
import { CoreComponentRegistry } from "../ecs/CoreComponents";

/**
 * Resolves jump requests against grounded, coyote, buffered and multi-jump state.
 *
 * Input sampling is intentionally kept separate: this system is the single
 * authority that applies vertical jump impulses and short-hop release clamps.
 * All mutable state lives in ECS components for snapshot/replay compatibility.
 *
 * @public
 */
export class PlatformerJumpSystem extends System<CoreComponentRegistry> {
  public update(world: World<CoreComponentRegistry>, _deltaTime: number): void {
    if (world.getResource("IsPaused") === true) return;

    const entities = world.query(
      "PlatformerInput",
      "PlatformerJumper",
      "PlatformerGroundState",
      "PlatformerGravityConfig",
      "Velocity"
    );

    for (let i = 0; i < entities.length; i++) {
      const entity = entities[i];
      const input = world.getComponent(entity, "PlatformerInput");
      const jumper = world.getComponent(entity, "PlatformerJumper");
      const ground = world.getComponent(entity, "PlatformerGroundState");
      const contactState = world.getComponent(entity, "PhysicsContactState");
      const gravity = world.getComponent(entity, "PlatformerGravityConfig");
      const velocity = world.getComponent(entity, "Velocity");
      if (!input || !jumper || !ground || !gravity || !velocity) continue;

      // The resolved contact is authoritative when present; legacy entities fall back to GroundState.
      const isGrounded = contactState ? (contactState.isGrounded || ground.isGrounded) : ground.isGrounded;
      const maxJumps = Math.max(1, jumper.maxJumps ?? 1);
      let jumpsRemaining = jumper.jumpsRemaining ?? maxJumps;
      if (isGrounded) jumpsRemaining = maxJumps;

      const canGroundJump = isGrounded || jumper.coyoteTimer > 0;
      const canAirJump = jumpsRemaining > 0;
      const hasBufferedJump = jumper.jumpBufferTimer > 0;
      const requested = input.jumpPressed;

      let shouldJump = false;
      let isAirJump = false;

      if (requested) {
        if (canGroundJump) {
          shouldJump = true;
        } else if (canAirJump) {
          shouldJump = true;
          isAirJump = true;
        } else if (jumper.jumpBufferMax > 0) {
          const mutableJumper = world.getMutableComponent(entity, "PlatformerJumper");
          if (mutableJumper) mutableJumper.jumpBufferTimer = mutableJumper.jumpBufferMax;
        }
      } else if (hasBufferedJump && canGroundJump) {
        shouldJump = true;
      }

      if (shouldJump) {
        const mutableVelocity = world.getMutableComponent(entity, "Velocity");
        const mutableGround = world.getMutableComponent(entity, "PlatformerGroundState");
        const mutableJumper = world.getMutableComponent(entity, "PlatformerJumper");
        if (mutableVelocity && mutableGround && mutableJumper) {
          const carrier = mutableGround.carrierEntity;
          const supportContact = carrier === undefined
            ? undefined
            : contactState?.groundContact?.entity === carrier
              ? contactState.groundContact
              : contactState?.contacts.find((contact) => contact.entity === carrier);
          // Carry runs after jump resolution. Include the full support impulse here so
          // PlatformCarrySystem can remove it and retain only preserveMomentum.
          mutableVelocity.vy = -gravity.jumpVelocity
            + (supportContact?.surfaceVelocity.y ?? 0);
          mutableGround.isGrounded = false;
          const mutableContactState = world.getMutableComponent(entity, "PhysicsContactState");
          if (mutableContactState) {
            mutableContactState.isGrounded = false;
            mutableContactState.groundContact = undefined;
          }
          mutableJumper.coyoteTimer = 0;
          mutableJumper.jumpBufferTimer = 0;
          mutableJumper.jumpsRemaining = isAirJump
            ? Math.max(0, jumpsRemaining - 1)
            : Math.max(0, maxJumps - 1);
          world.getEventBus()?.emit("PlaySFX", { name: "jump" });
        }
      } else if (jumper.jumpsRemaining !== jumpsRemaining) {
        const mutableJumper = world.getMutableComponent(entity, "PlatformerJumper");
        if (mutableJumper) mutableJumper.jumpsRemaining = jumpsRemaining;
      }

      if (input.jumpReleased && velocity.vy < -gravity.minJumpVelocity) {
        const mutableVelocity = world.getMutableComponent(entity, "Velocity");
        if (mutableVelocity) mutableVelocity.vy = -gravity.minJumpVelocity;
      }
    }
  }
}
