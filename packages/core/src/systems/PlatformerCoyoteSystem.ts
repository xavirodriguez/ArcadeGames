import { World } from "../ecs/World";
import { System } from "../ecs/System";
import { ComponentRegistry } from "../ecs/Component";
import { CoreComponentRegistry } from "../ecs/CoreComponents";

/**
 * Advances coyote-time and jump-buffer timers.
 *
 * Jump impulses are deliberately resolved by PlatformerJumpSystem so that
 * buffered, coyote and multi-jumps share one decision point.
 *
 * @public
 */
export class PlatformerCoyoteSystem<TRegistry extends ComponentRegistry = CoreComponentRegistry> extends System<TRegistry> {
  public update(world: World<TRegistry>, deltaTime: number): void {
    if (world.getResource("IsPaused") === true) return;
    const jumperType = "PlatformerJumper" as Extract<keyof TRegistry, string>;
    const groundType = "PlatformerGroundState" as Extract<keyof TRegistry, string>;
    const entities = world.query(jumperType, groundType);
    const elapsed = Number.isFinite(deltaTime) ? Math.max(0, deltaTime) : 0;

    for (let i = 0; i < entities.length; i++) {
      const entity = entities[i];
      const jumper = world.getComponent(entity, jumperType) as CoreComponentRegistry["PlatformerJumper"] | undefined;
      const ground = world.getComponent(entity, groundType) as CoreComponentRegistry["PlatformerGroundState"] | undefined;
      if (!jumper || !ground) continue;

      const nextCoyote = ground.isGrounded
        ? jumper.coyoteTimeMax
        : Math.max(0, jumper.coyoteTimer - elapsed);
      const nextBuffer = Math.max(0, jumper.jumpBufferTimer - elapsed);

      if (nextCoyote !== jumper.coyoteTimer || nextBuffer !== jumper.jumpBufferTimer) {
        const mutable = world.getMutableComponent(entity, jumperType) as CoreComponentRegistry["PlatformerJumper"] | undefined;
        if (mutable) {
          mutable.coyoteTimer = nextCoyote;
          mutable.jumpBufferTimer = nextBuffer;
        }
      }
    }
  }
}
