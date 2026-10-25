// src/games/echorunner/systems/EchoRunnerSpriteSystem.ts

import { System, World, CoreComponentRegistry, SystemPhase } from "@tiny-aster/core";
import {
  createSpriteAnimator,
  playAnimation,
  updateSpriteAnimator,
  SpriteAnimatorComponent,
} from "../../shared/sprites";
import { resolveEchoRunnerSpriteMotion } from "../rendering/EchoRunnerPixelArt";

/**
 * Keeps the player's SpriteAnimator in sync with movement / attack state.
 * Temporary bridge while we test the oni_red sheet as protagonist.
 */
export class EchoRunnerSpriteSystem extends System<CoreComponentRegistry> {
  public update(world: World<CoreComponentRegistry>, deltaTime: number): void {
    const players = world.query("PlatformerInput", "Velocity", "Transform");

    for (const entity of players) {
      // Ensure the component exists (in case it was not added at spawn)
      let animator = world.getComponent(entity, "SpriteAnimator") as
        | SpriteAnimatorComponent
        | undefined;

      if (!animator) {
        animator = createSpriteAnimator("oni_red", "idle");
        world.addComponent(entity, {
          type: "SpriteAnimator",
          ...animator,
        } as any);
        continue;
      }

      const vel = world.getComponent(entity, "Velocity");
      const transform = world.getComponent(entity, "Transform");
      const ground = world.getComponent(entity, "GroundState") as
        | { grounded?: boolean }
        | undefined;
      const echoInput = world.getComponent(entity, "EchoRunnerInput") as
        | { pulseCooldown?: number }
        | undefined;

      const vx = vel?.vx ?? 0;
      const vy = vel?.vy ?? 0;
      const isGrounded = ground?.grounded ?? true;
      // Treat recent pulse as attacking (simple heuristic)
      const isAttacking = (echoInput?.pulseCooldown ?? 0) > 0.3;

      const motion = resolveEchoRunnerSpriteMotion(vx, vy, isGrounded, isAttacking);

      // Map internal motion names to sheet animations
      let targetAnim = "idle";
      switch (motion) {
        case "run":
          targetAnim = "walk";
          break;
        case "attack":
          targetAnim = "attack";
          break;
        case "jump":
        case "fall":
          // No dedicated jump/fall frames yet → keep idle or walk
          targetAnim = Math.abs(vx) > 20 ? "walk" : "idle";
          break;
        default:
          targetAnim = "idle";
      }

      playAnimation(animator, targetAnim);

      // Facing
      animator.flipX = (transform?.scaleX ?? 1) < 0;

      // Advance frames
      updateSpriteAnimator(animator, deltaTime);

      // Write back (mutateComponent keeps change tracking happy)
      world.mutateComponent(entity, "SpriteAnimator", (comp) => {
        const a = comp as SpriteAnimatorComponent;
        a.currentAnim = animator!.currentAnim;
        a.frameIndex = animator!.frameIndex;
        a.timer = animator!.timer;
        a.flipX = animator!.flipX;
      });
    }
  }
}

export const echoRunnerSpriteSystemPhase = SystemPhase.Simulation;
