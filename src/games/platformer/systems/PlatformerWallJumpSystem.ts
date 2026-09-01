import { System, World, CoreComponentRegistry, Component } from "@tiny-aster/core";

export interface WallJumpUnlockedComponent extends Component {
  type: "WallJumpUnlocked";
  unlocked: boolean;
}

export class PlatformerWallJumpSystem extends System<CoreComponentRegistry> {
  public update(world: World<CoreComponentRegistry>, _deltaTime: number): void {
    if (world.getResource("IsPaused") === true) return;

    const players = world.query("PlatformerInput", "WallJumpUnlocked", "PlatformerGroundState", "Velocity", "PlatformerJumper");

    for (let i = 0; i < players.length; i++) {
      const player = players[i];
      const groundState = world.getComponent(player, "PlatformerGroundState") as any;
      const input = world.getComponent(player, "PlatformerInput") as any;
      const vel = world.getMutableComponent(player, "Velocity");
      const jumper = world.getMutableComponent(player, "PlatformerJumper") as any;
      const detector = world.getComponent(player, "GroundDetector") as any;

      if (!groundState || !input || !vel || !jumper) continue;

      const isGrounded = groundState.isGrounded;
      const hasWallAhead = detector ? detector.hasWallAhead : (input.moveDir !== 0);

      // Wall slide: not grounded, moving towards wall, falling
      if (!isGrounded && hasWallAhead && vel.vy > 0) {
        // Slow down fall speed while sliding on wall
        if (vel.vy > 60) {
          vel.vy = 60;
        }

        // Wall jump trigger
        if (input.jumpPressed) {
          const wallDir = input.moveDir !== 0 ? Math.sign(input.moveDir) : 1;
          vel.vx = -wallDir * 250;
          vel.vy = -320;
          jumper.coyoteTimer = 0;
          jumper.jumpBufferTimer = 0;

          const eventBus = world.getEventBus();
          if (eventBus) {
            eventBus.emit("PlaySFX", { name: "jump" });
          }
        }
      }
    }
  }
}
