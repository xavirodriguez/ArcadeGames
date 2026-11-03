import { System, SystemPhase, World } from "@tiny-aster/core";
import {
  SpriteAnimatorComponent,
  createSpriteAnimator,
  playAnimation,
  updateSpriteAnimator
} from "../../../shared/sprites";
import {
  SEA_DRAGON_SECONDS_PER_TICK,
  SEA_DRAGON_SPRITE_ID,
  SEA_DRAGON_SHAPE
} from "../../rendering/SeaDragonVisuals";
import {
  GHOST_GALLEON_SECONDS_PER_TICK,
  GHOST_GALLEON_SPRITE_ID,
  GHOST_GALLEON_SHAPE
} from "../../rendering/GhostGalleonVisuals";
import type { SpaceInvadersComponentRegistry } from "../../types/SpaceInvadersTypes";

/**
 * Presentation system that steps and selects clips for Nautical sprite animators
 * (Sea Dragon and Ghost Galleon / UFO alias) on entities carrying SpriteAnimator.
 */
export class NauticalSpriteAnimationSystem extends System<SpaceInvadersComponentRegistry> {
  public update(world: World<SpaceInvadersComponentRegistry>, _deltaTime: number): void {
    const entities = world.query("Render");

    for (const entity of entities) {
      const render = world.getComponent(entity, "Render");
      if (!render || !render.visible) continue;

      const shape = render.shape;
      const isSeaDragon = shape === SEA_DRAGON_SHAPE;
      const isGhostGalleon = shape === GHOST_GALLEON_SHAPE || shape === "ufo";

      if (!isSeaDragon && !isGhostGalleon) continue;

      let animator = world.getMutableComponent(entity, "SpriteAnimator");
      if (!animator) {
        const sheetId = isSeaDragon ? SEA_DRAGON_SPRITE_ID : GHOST_GALLEON_SPRITE_ID;
        const initialClip = isSeaDragon ? "fly" : "sail";
        const newAnimator: SpriteAnimatorComponent = createSpriteAnimator(sheetId, initialClip);
        world.addComponent(entity, newAnimator);
        animator = world.getMutableComponent(entity, "SpriteAnimator");
      }
      if (!animator) continue;

      const flashing = render.hitFlashFrames > 0;
      const dt = isSeaDragon ? SEA_DRAGON_SECONDS_PER_TICK : GHOST_GALLEON_SECONDS_PER_TICK;
      updateSpriteAnimator(animator, dt);

      if (isSeaDragon) {
        if (flashing && animator.currentAnim !== "hit") {
          playAnimation(animator, "hit");
        } else if (!flashing && animator.currentAnim === "hit") {
          playAnimation(animator, "fly");
        }
      } else {
        if (flashing && animator.currentAnim !== "hit") {
          playAnimation(animator, "hit");
        } else if (!flashing && animator.currentAnim === "hit") {
          playAnimation(animator, "sail");
        }
      }
    }
  }
}
