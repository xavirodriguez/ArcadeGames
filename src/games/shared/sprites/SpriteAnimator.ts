// src/games/shared/sprites/SpriteAnimator.ts

import {
  createSpriteAnimator as createCoreSpriteAnimator,
  stepSpriteAnimator,
  playAnimation as playCoreAnimation,
  type SpriteAnimatorComponent
} from "@tiny-aster/core";
import { SpriteRegistry } from "./SpriteRegistry";

export type { SpriteAnimatorComponent };

/**
 * Creates a new SpriteAnimator component.
 *
 * @remarks
 * Re-exported from `@tiny-aster/core` for backward compatibility.
 */
export function createSpriteAnimator(
  sheetId: string,
  initialAnim = "idle"
): SpriteAnimatorComponent {
  return createCoreSpriteAnimator(sheetId, initialAnim);
}

/**
 * Advances the animation by dt seconds, catching up across every elapsed
 * frame boundary using the SpriteRegistry catalogue. Returns true exactly
 * once when a non-looping clip completes.
 */
export function updateSpriteAnimator(
  animator: SpriteAnimatorComponent,
  dt: number
): boolean {
  return stepSpriteAnimator(animator, dt, (sheetId) => SpriteRegistry.get(sheetId));
}

/**
 * Switches to a new animation (restarts unless already playing and forceRestart=false).
 *
 * @remarks
 * Re-exported from `@tiny-aster/core` for backward compatibility.
 */
export function playAnimation(
  animator: SpriteAnimatorComponent,
  animName: string,
  forceRestart = false
): void {
  playCoreAnimation(animator, animName, forceRestart);
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
