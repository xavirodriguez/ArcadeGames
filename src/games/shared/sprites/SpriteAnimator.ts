// src/games/shared/sprites/SpriteAnimator.ts

import { SpriteRegistry } from "./SpriteRegistry";
import type { SpriteAnimatorComponent } from "./SpriteTypes";

export type { SpriteAnimatorComponent };

/** Creates a new SpriteAnimator component. */
export function createSpriteAnimator(
  sheetId: string,
  initialAnim = "idle"
): SpriteAnimatorComponent {
  return {
    sheetId,
    currentAnim: initialAnim,
    frameIndex: 0,
    timer: 0,
    finished: false,
    flipX: false,
    scale: 1
  };
}

/**
 * Advances the animation by dt seconds, catching up across every elapsed
 * frame boundary. Returns true exactly once when a non-looping clip completes.
 */
export function updateSpriteAnimator(
  animator: SpriteAnimatorComponent,
  dt: number
): boolean {
  if (animator.finished === true || !Number.isFinite(dt) || dt <= 0) return false;

  const sheet = SpriteRegistry.get(animator.sheetId);
  if (!sheet) return false;

  const anim = sheet.animations[animator.currentAnim];
  if (
    !anim ||
    anim.frames.length === 0 ||
    !Number.isFinite(anim.frameDuration) ||
    anim.frameDuration <= 0
  ) {
    return false;
  }

  const elapsed = animator.timer + dt;
  if (!Number.isFinite(elapsed)) {
    if (anim.loop) {
      animator.frameIndex = 0;
      animator.timer = 0;
      return false;
    }

    animator.frameIndex = anim.frames.length - 1;
    animator.timer = 0;
    animator.finished = true;
    return true;
  }

  const frameSteps = Math.floor(elapsed / anim.frameDuration);
  if (frameSteps <= 0) {
    animator.timer = elapsed;
    return false;
  }

  if (!Number.isFinite(frameSteps)) {
    if (anim.loop) {
      animator.frameIndex = 0;
      animator.timer = elapsed % anim.frameDuration;
      return false;
    }

    animator.frameIndex = anim.frames.length - 1;
    animator.timer = 0;
    animator.finished = true;
    return true;
  }

  if (anim.loop) {
    const currentIndex = Math.max(
      0,
      Math.min(animator.frameIndex, anim.frames.length - 1)
    );
    animator.frameIndex = (currentIndex + frameSteps) % anim.frames.length;
    animator.timer = elapsed % anim.frameDuration;
    return false;
  }

  const nextFrameIndex = Math.max(0, animator.frameIndex) + frameSteps;
  if (nextFrameIndex >= anim.frames.length) {
    animator.frameIndex = anim.frames.length - 1;
    animator.timer = 0;
    animator.finished = true;
    return true;
  }

  animator.frameIndex = nextFrameIndex;
  animator.timer = elapsed % anim.frameDuration;
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
  animator.finished = false;
}

/** Returns the current source rectangle for the active frame, or null. */
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
