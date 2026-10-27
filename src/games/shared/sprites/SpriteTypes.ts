// Keep one public metadata contract for sprite sheets across consumers.
export type {
  SpriteAnimationDefinition as SpriteAnimationDef,
  SpriteFrameRect,
  SpriteImageSource,
  SpriteSheetDefinition as SpriteSheetDef
} from "@tiny-aster/core";

/**
 * ECS component that drives sprite animation.
 */
export interface SpriteAnimatorComponent {
  sheetId: string;
  currentAnim: string;
  /** Current frame index inside the active animation */
  frameIndex: number;
  /** Time accumulator (seconds) */
  timer: number;
  /** Horizontal flip */
  flipX: boolean;
  /** Uniform scale */
  scale: number;
  /** Optional visual offsets */
  offsetX?: number;
  offsetY?: number;
}
