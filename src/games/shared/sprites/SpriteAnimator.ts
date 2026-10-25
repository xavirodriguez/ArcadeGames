// src/games/shared/sprites/SpriteAnimator.ts

import { SpriteRegistry } from "./SpriteRegistry";
import { SpriteAnimatorComponent } from "./SpriteTypes";

/**
 * Creates a new SpriteAnimator component.
 */
export function createSpriteAnimator(
  sheetId: string,
  initialAnim = "idle"
): SpriteAnimatorComponent {
  return {
    sheetId,
    currentAnim: initialAnim,
    frameIndex: 0,
    timer: 0,
    flipX: false,
    scale: 1,
  };
}

/**
 * Advances the animation by dt seconds.
 * Returns true when a non-looping animation has finished.
 */
export function updateSpriteAnimator(
  animator: SpriteAnimatorComponent,
  dt: number
): boolean {
  const sheet = SpriteRegistry.get(animator.sheetId);
  if (!sheet) return false;

  const anim = sheet.animations[animator.currentAnim];
  if (!anim || anim.frames.length === 0) return false;

  animator.timer += dt;

  if (animator.timer >= anim.frameDuration) {
    animator.timer -= anim.frameDuration;
    animator.frameIndex++;

    if (animator.frameIndex >= anim.frames.length) {
      if (anim.loop) {
        animator.frameIndex = 0;
      } else {
        animator.frameIndex = anim.frames.length - 1;
        return true; // finished
      }
    }
  }

  return false;
}

/**
 * Switches to a new animation (restarts unless already playing and forceRestart=false).
 */
export function playAnimation(
  animator: SpriteAnimatorComponent,
  animName: string,
  forceRestart = false
): void {
  if (animator.currentAnim === animName && !forceRestart) return;

  animator.currentAnim = animName;
  animator.frameIndex = 0;
  animator.timer = 0;
}

/**
 * Returns the current source rectangle for the active frame, or null.
 */
export function getCurrentFrameRect(
  animator: SpriteAnimatorComponent
): { x: number; y: number; w: number; h: number } | null {
  const sheet = SpriteRegistry.get(animator.sheetId);
  if (!sheet) return null;

  const anim = sheet.animations[animator.currentAnim];
  if (!anim || anim.frames.length === 0) return null;

  const idx = Math.max(0, Math.min(animator.frameIndex, anim.frames.length - 1));
  return anim.frames[idx] ?? null;
}
