// src/games/shared/sprites/SpriteTypes.ts

/**
 * Source rectangle inside a sprite sheet.
 */
export interface SpriteFrameRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Definition of a single animation (idle, walk, attack, etc.).
 */
export interface SpriteAnimationDef {
  /** Animation name */
  name: string;
  /** Ordered list of source rectangles */
  frames: SpriteFrameRect[];
  /** Duration of each frame in seconds */
  frameDuration: number;
  /** Whether the animation loops */
  loop: boolean;
}

/**
 * Full definition of a sprite sheet + its animations.
 * Register one of these per character / enemy.
 */
export type SpriteImageSource =
  | number
  | string
  | { uri?: string; localUri?: string }
  | null;

export interface SpriteSheetDef {
  id: string;
  /** Metro require() of a PNG, a URI, or an Expo Asset source. */
  imageSource: SpriteImageSource;
  /** Logical frame size used for collision / positioning and full-image fit. */
  frameWidth: number;
  frameHeight: number;
  /** "full-image" treats the entire PNG as a single static frame. */
  sourceMode?: "frames" | "full-image";
  /** Normalized destination anchor. Defaults to bottom-center (character feet). */
  anchor?: { x: number; y: number };
  animations: Record<string, SpriteAnimationDef>;
}

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
