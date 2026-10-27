// Keep one public metadata contract for sprite sheets across consumers.
export type {
  SpriteAnimationDefinition as SpriteAnimationDef,
  SpriteFrameRect,
  SpriteImageSource,
  SpriteSheetDefinition as SpriteSheetDef
} from "@tiny-aster/core";

/**
 * Runtime animation state. ECS entities store this shape with type "SpriteAnimator",
 * while renderer/theme code may use it as a plain in-memory animation state.
 */
export interface SpriteAnimatorComponent {
  sheetId: string;
  currentAnim: string;
  /** Current frame index inside the active animation */
  frameIndex: number;
  /** Time accumulator (seconds) */
  timer: number;
  /** Whether a non-looping animation has completed. Reset by playAnimation. */
  finished?: boolean;
  /** Horizontal flip */
  flipX: boolean;
  /** Uniform scale */
  scale: number;
  /** Optional visual offsets */
  offsetX?: number;
  offsetY?: number;
}
