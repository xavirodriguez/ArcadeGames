import type {
  SpriteImageDimensions,
  SpriteSheetDefinition
} from "@tiny-aster/core";

export interface SpriteValidationIssue {
  code: string;
  spriteId: string;
  message: string;
}

export interface SpriteCatalogValidationContext {
  /** Repository-relative paths that exist and could be read. */
  existingAssetPaths: ReadonlySet<string>;
  /** Dimensions for valid PNG files, indexed by repository-relative path. */
  dimensionsByAssetPath: ReadonlyMap<string, SpriteImageDimensions>;
}

/**
 * Read PNG dimensions without a native image library.
 *
 * Returns null when the bytes do not contain a valid PNG signature and IHDR
 * dimensions. This intentionally does not decode the complete image.
 */
export function readPngDimensions(bytes: Uint8Array): SpriteImageDimensions | null {
  const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (bytes.length < 24) return null;

  for (let index = 0; index < signature.length; index++) {
    if (bytes[index] !== signature[index]) return null;
  }

  if (
    bytes[12] !== 0x49 ||
    bytes[13] !== 0x48 ||
    bytes[14] !== 0x44 ||
    bytes[15] !== 0x52
  ) {
    return null;
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (view.getUint32(8, false) !== 13) return null;
  const width = view.getUint32(16, false);
  const height = view.getUint32(20, false);
  if (width <= 0 || height <= 0) return null;

  return { width, height };
}

/** Validate the static metadata for one sprite sheet. */
export function validateSpriteSheetDefinition(
  sheet: SpriteSheetDefinition,
  dimensions?: SpriteImageDimensions
): SpriteValidationIssue[] {
  const issues: SpriteValidationIssue[] = [];
  const add = (code: string, message: string): void => {
    issues.push({ code, spriteId: sheet.id || "<missing-id>", message });
  };

  if (sheet.id.trim().length === 0) add("EMPTY_ID", "Sprite id must not be empty.");
  if (sheet.assetPath.trim().length === 0) {
    add("EMPTY_ASSET_PATH", "assetPath must point to a repository asset.");
  } else if (
    sheet.assetPath.startsWith("/") ||
    /^[A-Za-z]:[\\/]/.test(sheet.assetPath) ||
    /(^|[\\/])\.\.([\\/]|$)/.test(sheet.assetPath)
  ) {
    add("INVALID_ASSET_PATH", "assetPath must be repository-relative and must not traverse parent directories.");
  }

  if (!Number.isFinite(sheet.frameWidth) || sheet.frameWidth <= 0) {
    add("INVALID_LOGICAL_WIDTH", "frameWidth must be a finite number greater than zero.");
  }
  if (!Number.isFinite(sheet.frameHeight) || sheet.frameHeight <= 0) {
    add("INVALID_LOGICAL_HEIGHT", "frameHeight must be a finite number greater than zero.");
  }

  const anchor = sheet.anchor ?? { x: 0.5, y: 1 };
  if (
    !Number.isFinite(anchor.x) ||
    !Number.isFinite(anchor.y) ||
    anchor.x < 0 ||
    anchor.x > 1 ||
    anchor.y < 0 ||
    anchor.y > 1
  ) {
    add("INVALID_ANCHOR", "Anchor coordinates must be finite normalized values in the range [0, 1].");
  }

  if (dimensions && (
    !Number.isInteger(dimensions.width) ||
    !Number.isInteger(dimensions.height) ||
    dimensions.width <= 0 ||
    dimensions.height <= 0
  )) {
    add("INVALID_IMAGE_DIMENSIONS", "PNG dimensions must be positive integers.");
  }

  const sourceMode: string = sheet.sourceMode ?? "frames";
  for (const [animationKey, animation] of Object.entries(sheet.animations)) {
    if (animationKey.trim().length === 0) {
      add("EMPTY_ANIMATION_NAME", "Animation keys must not be empty.");
    }
    if (animation.name !== animationKey) {
      add("ANIMATION_NAME_MISMATCH", `Animation key "${animationKey}" does not match name "${animation.name}".`);
    }
    if (!Number.isFinite(animation.frameDuration) || animation.frameDuration <= 0) {
      add("INVALID_FRAME_DURATION", `Animation "${animationKey}" must have a positive finite frameDuration in seconds.`);
    }
    if (typeof animation.loop !== "boolean") {
      add("INVALID_LOOP_FLAG", `Animation "${animationKey}" must declare loop as a boolean.`);
    }

    if (sourceMode === "full-image" && animation.frames.length > 0) {
      add("FULL_IMAGE_HAS_FRAMES", `Animation "${animationKey}" must not define frame rectangles when sourceMode is "full-image".`);
    }
    if (sourceMode !== "full-image" && animation.frames.length === 0) {
      add("EMPTY_ANIMATION_FRAMES", `Animation "${animationKey}" has no source frames.`);
    }

    if (animation.events !== undefined) {
      if (!Array.isArray(animation.events)) {
        add("INVALID_ANIMATION_EVENTS", `Animation "${animationKey}" events must be an array when defined.`);
      } else {
        for (let eventIndex = 0; eventIndex < animation.events.length; eventIndex++) {
          const event = animation.events[eventIndex];
          if (!event || typeof event !== "object") {
            add("INVALID_EVENT_SPEC", `Animation "${animationKey}" event at index ${eventIndex} must be an object.`);
            continue;
          }
          if (typeof event.type !== "string" || event.type.trim().length === 0) {
            add("INVALID_EVENT_TYPE", `Animation "${animationKey}" event at index ${eventIndex} must declare a non-empty string type.`);
          }
          if (!Number.isInteger(event.frame) || event.frame < 0 || event.frame >= animation.frames.length) {
            add(
              "EVENT_FRAME_OUT_OF_BOUNDS",
              `Animation "${animationKey}" event at index ${eventIndex} has frame ${event.frame}, which is out of bounds (must be between 0 and ${animation.frames.length - 1}).`
            );
          }
          if (event.payload !== undefined && (typeof event.payload !== "object" || event.payload === null || Array.isArray(event.payload))) {
            add("INVALID_EVENT_PAYLOAD", `Animation "${animationKey}" event at index ${eventIndex} payload must be a Record<string, unknown> object when defined.`);
          }
        }
      }
    }

    for (let frameIndex = 0; frameIndex < animation.frames.length; frameIndex++) {
      const frame = animation.frames[frameIndex];
      const validCoordinates = [frame.x, frame.y, frame.w, frame.h].every(Number.isFinite);
      if (
        !validCoordinates ||
        !Number.isInteger(frame.x) ||
        !Number.isInteger(frame.y) ||
        !Number.isInteger(frame.w) ||
        !Number.isInteger(frame.h) ||
        frame.x < 0 ||
        frame.y < 0 ||
        frame.w <= 0 ||
        frame.h <= 0
      ) {
        add("INVALID_FRAME_RECT", `Animation "${animationKey}" frame ${frameIndex} must have non-negative integer coordinates and positive integer dimensions.`);
        continue;
      }

      if (dimensions && (
        frame.x + frame.w > dimensions.width ||
        frame.y + frame.h > dimensions.height
      )) {
        add(
          "FRAME_OUT_OF_BOUNDS",
          `Animation "${animationKey}" frame ${frameIndex} (${frame.x}, ${frame.y}, ${frame.w}, ${frame.h}) exceeds the ${dimensions.width}x${dimensions.height} image.`
        );
      }
    }
  }

  if (sourceMode !== "frames" && sourceMode !== "full-image") {
    add("INVALID_SOURCE_MODE", `Unsupported sourceMode "${String(sourceMode)}".`);
  }

  return issues;
}

/** Validate a catalogue, including duplicate ids, missing PNGs and frame bounds. */
export function validateSpriteCatalog(
  sheets: readonly SpriteSheetDefinition[],
  context: SpriteCatalogValidationContext
): SpriteValidationIssue[] {
  const issues: SpriteValidationIssue[] = [];
  const ids = new Set<string>();

  for (const sheet of sheets) {
    if (ids.has(sheet.id)) {
      issues.push({
        code: "DUPLICATE_ID",
        spriteId: sheet.id || "<missing-id>",
        message: `Sprite id "${sheet.id}" is declared more than once.`
      });
    }
    ids.add(sheet.id);

    if (!context.existingAssetPaths.has(sheet.assetPath)) {
      issues.push({
        code: "MISSING_ASSET",
        spriteId: sheet.id || "<missing-id>",
        message: `PNG does not exist or could not be read: ${sheet.assetPath}`
      });
    } else if (!context.dimensionsByAssetPath.has(sheet.assetPath)) {
      issues.push({
        code: "INVALID_PNG",
        spriteId: sheet.id || "<missing-id>",
        message: `File is not a PNG with a valid IHDR chunk: ${sheet.assetPath}`
      });
    }

    issues.push(
      ...validateSpriteSheetDefinition(
        sheet,
        context.dimensionsByAssetPath.get(sheet.assetPath)
      )
    );
  }

  return issues;
}
