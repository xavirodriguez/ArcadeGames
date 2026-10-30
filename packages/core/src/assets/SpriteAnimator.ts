import { Component } from "../ecs/Component";
import { SpriteSheetDefinition } from "./SpriteSheetDefinition";

/**
 * Runtime animation playback state for sprite sheets.
 *
 * Can be used as a tagged ECS component (`type: "SpriteAnimator"`) or as a standalone
 * in-memory animation state object.
 *
 * @public
 */
export interface SpriteAnimatorComponent extends Component {
  /** Component discriminator type. */
  type: "SpriteAnimator";
  /** Stable sheet identifier matching registered sprite sheet definition. */
  sheetId: string;
  /** Active animation clip name. */
  currentAnim: string;
  /** Current frame index inside the active animation clip. */
  frameIndex: number;
  /** Time accumulator in seconds. */
  timer: number;
  /** Whether a non-looping animation clip has completed. */
  finished?: boolean;
  /** Horizontal flip flag. */
  flipX: boolean;
  /** Uniform rendering scale factor. */
  scale: number;
  /** Optional visual X offset. */
  offsetX?: number;
  /** Optional visual Y offset. */
  offsetY?: number;
}

/**
 * Creates a new SpriteAnimator component or state object.
 *
 * @public
 */
export function createSpriteAnimator(
  sheetId: string,
  initialAnim = "idle"
): SpriteAnimatorComponent {
  return {
    type: "SpriteAnimator",
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
 * Advances animation playback for the given animator by dt seconds using the provided
 * SpriteSheetDefinition lookup.
 *
 * Pure timing logic: catches up across every frame boundary covered by dt.
 * Returns true exactly once when a non-looping clip completes.
 *
 * @public
 */
export function stepSpriteAnimator(
  animator: {
    sheetId: string;
    currentAnim: string;
    frameIndex: number;
    timer: number;
    finished?: boolean;
  },
  dt: number,
  sheetLookup: (sheetId: string) => SpriteSheetDefinition | undefined
): boolean {
  if (animator.finished === true || !Number.isFinite(dt) || dt <= 0) return false;

  const sheet = sheetLookup(animator.sheetId);
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
 *
 * @public
 */
export function playAnimation(
  animator: {
    currentAnim: string;
    frameIndex: number;
    timer: number;
    finished?: boolean;
  },
  animName: string,
  forceRestart = false
): void {
  if (animator.currentAnim === animName && !forceRestart) return;

  animator.currentAnim = animName;
  animator.frameIndex = 0;
  animator.timer = 0;
  animator.finished = false;
}
