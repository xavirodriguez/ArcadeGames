/**
 * Platform-independent metadata for a sprite sheet.
 *
 * Keep image loading and rendering backend-specific; this contract describes
 * the source image, logical dimensions, frame rectangles and animation clips.
 *
 * @public
 */
export interface SpriteFrameRect {
  /** X coordinate of the frame in source-image pixels. */
  x: number;
  /** Y coordinate of the frame in source-image pixels. */
  y: number;
  /** Source-frame width in pixels. */
  w: number;
  /** Source-frame height in pixels. */
  h: number;
}

/**
 * A source resolved by the platform asset provider.
 *
 * Numeric sources support Metro's static require() values. The URI form allows
 * already-resolved Expo assets and web URLs without coupling core to Expo.
 *
 * @public
 */
export type SpriteImageSource =
  | number
  | string
  | { uri?: string; localUri?: string }
  | null;

/**
 * Animation clip represented by ordered source rectangles.
 *
 * frameDuration is seconds per frame, independent of the game-loop tick rate.
 *
 * @public
 */
export interface SpriteAnimationDefinition {
  /** Animation name. It should match the key in SpriteSheetDefinition.animations. */
  name: string;
  /** Ordered source rectangles used by this clip. */
  frames: SpriteFrameRect[];
  /** Duration of each frame in seconds. */
  frameDuration: number;
  /** Whether playback loops indefinitely. */
  loop: boolean;
}

/**
 * Canonical visual metadata for one sprite sheet.
 *
 * assetPath is always repository-relative and exists for tooling/validation;
 * imageSource is the runtime handle consumed by the active platform.
 *
 * frameWidth/frameHeight describe the logical fit box. For sourceMode
 * "frames", actual source rectangles are provided by each animation. For
 * "full-image", the renderer uses the complete source image as one frame and
 * fits it into the logical box while preserving aspect ratio.
 *
 * @public
 */
export interface SpriteSheetDefinition {
  /** Stable identifier used by gameplay/rendering code. */
  id: string;
  /** Repository-relative source image path, used by asset validation. */
  assetPath: string;
  /** Runtime image handle, resolved by a platform-specific adapter. */
  imageSource: SpriteImageSource;
  /** Logical width used to fit the sprite in world space. */
  frameWidth: number;
  /** Logical height used to fit the sprite in world space. */
  frameHeight: number;
  /** Whether to draw individual frames or the full image. Defaults to "frames". */
  sourceMode?: "frames" | "full-image";
  /** Normalized destination anchor. Defaults to bottom-center { x: 0.5, y: 1 }. */
  anchor?: { x: number; y: number };
  /** Animation clips indexed by stable animation name. */
  animations: Record<string, SpriteAnimationDefinition>;
}

/** Pixel dimensions read from a PNG IHDR chunk. */
export interface SpriteImageDimensions {
  width: number;
  height: number;
}


/** Normalized destination anchor in the sprite's local coordinate space. */
export interface SpriteAnchor {
  x: number;
  y: number;
}

/** Destination rectangle relative to the entity's transform origin. */
export interface SpriteDestinationRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Calculates an anchored destination rectangle shared by Canvas, Skia and
 * game-level sprite drawers. Returns null for invalid geometry.
 */
export function calculateSpriteDestinationRect(
  width: number,
  height: number,
  anchor: SpriteAnchor
): SpriteDestinationRect | null {
  if (
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width <= 0 ||
    height <= 0 ||
    !Number.isFinite(anchor.x) ||
    !Number.isFinite(anchor.y) ||
    anchor.x < 0 ||
    anchor.x > 1 ||
    anchor.y < 0 ||
    anchor.y > 1
  ) {
    return null;
  }

  return {
    x: anchor.x === 0 ? 0 : -width * anchor.x,
    y: anchor.y === 0 ? 0 : -height * anchor.y,
    width,
    height
  };
}
