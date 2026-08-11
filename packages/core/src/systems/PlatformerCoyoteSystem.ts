import { World } from "../ecs/World";
import { System } from "../ecs/System";
import { ComponentRegistry } from "../ecs/Component";
import { CoreComponentRegistry } from "../ecs/CoreComponents";
import { Entity } from "../ecs/Entity";

/**
 * System that manages coyote time and jump buffering.
 * Decrements timers each frame, sets coyote time when grounded, and triggers buffered landing jumps.
 * @public
 */
export class PlatformerCoyoteSystem<TRegistry extends ComponentRegistry = CoreComponentRegistry> extends System<TRegistry> {
  public update(world: World<TRegistry>, deltaTime: number): void {
    const jumperType = "PlatformerJumper" as Extract<keyof TRegistry, string>;
    const groundStateType = "PlatformerGroundState" as Extract<keyof TRegistry, string>;
    const gravityConfigType = "PlatformerGravityConfig" as Extract<keyof TRegistry, string>;
    const velocityType = "Velocity" as Extract<keyof TRegistry, string>;

    const entities = world.query(jumperType, groundStateType, velocityType, gravityConfigType);

    for (const entity of entities) {
      const groundState = world.getComponent(entity, groundStateType) as any;
      const jumper = world.getComponent(entity, jumperType) as any;
      const gravityConfig = world.getComponent(entity, gravityConfigType) as any;
      const vel = world.getComponent(entity, velocityType) as any;

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

      // Check if we can trigger a buffered jump upon landing
      if (isGrounded && nextJumpBufferTimer > 0) {
        // Execute the jump!
        world.mutateComponent(entity, velocityType, (v: any) => {
          v.vy = -gravityConfig.jumpVelocity;
        });

        // Mutate ground state
        world.mutateComponent(entity, groundStateType, (g: any) => {
          g.isGrounded = false;
        });

        nextJumpBufferTimer = 0;
        nextCoyoteTimer = 0;
      }

      // Write updated timers
      world.mutateComponent(entity, jumperType, (j: any) => {
        j.coyoteTimer = nextCoyoteTimer;
        j.jumpBufferTimer = nextJumpBufferTimer;
      });
    }
  }
}
