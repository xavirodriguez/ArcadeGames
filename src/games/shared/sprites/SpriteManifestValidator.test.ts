import type { SpriteSheetDefinition } from "@tiny-aster/core";
import {
  readPngDimensions,
  validateSpriteCatalog,
  validateSpriteSheetDefinition
} from "./SpriteManifestValidator";

const validSheet: SpriteSheetDefinition = {
  id: "test_character",
  assetPath: "assets/test_character.png",
  imageSource: null,
  frameWidth: 16,
  frameHeight: 16,
  anchor: { x: 0.5, y: 1 },
  animations: {
    idle: {
      name: "idle",
      frames: [{ x: 0, y: 0, w: 16, h: 16 }],
      frameDuration: 0.1,
      loop: true
    }
  }
};

function createPngHeader(width: number, height: number): Uint8Array {
  const bytes = new Uint8Array(24);
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], 0);
  bytes.set([0x00, 0x00, 0x00, 0x0d], 8);
  bytes.set([0x49, 0x48, 0x44, 0x52], 12);
  const view = new DataView(bytes.buffer);
  view.setUint32(16, width, false);
  view.setUint32(20, height, false);
  return bytes;
}

describe("SpriteManifestValidator", () => {
  it("accepts valid atlas rectangles inside the image bounds", () => {
    const issues = validateSpriteSheetDefinition(validSheet, { width: 32, height: 32 });
    expect(issues).toEqual([]);
  });

  it("reports frames that extend beyond the image", () => {
    const sheet: SpriteSheetDefinition = {
      ...validSheet,
      animations: {
        idle: {
          ...validSheet.animations.idle,
          frames: [{ x: 16, y: 0, w: 17, h: 16 }]
        }
      }
    };

    expect(
      validateSpriteSheetDefinition(sheet, { width: 32, height: 32 })
        .map((issue) => issue.code)
    ).toContain("FRAME_OUT_OF_BOUNDS");
  });

  it("reports invalid timing, anchors, and empty animations", () => {
    const sheet: SpriteSheetDefinition = {
      ...validSheet,
      anchor: { x: 1.5, y: -0.1 },
      animations: {
        idle: {
          name: "idle",
          frames: [],
          frameDuration: 0,
          loop: true
        }
      }
    };

    const codes = validateSpriteSheetDefinition(sheet).map((issue) => issue.code);
    expect(codes).toContain("INVALID_ANCHOR");
    expect(codes).toContain("INVALID_FRAME_DURATION");
    expect(codes).toContain("EMPTY_ANIMATION_FRAMES");
  });

  it("reports duplicate ids, missing files, and invalid PNGs", () => {
    const issues = validateSpriteCatalog(
      [validSheet, { ...validSheet, assetPath: "assets/another.png" }, { ...validSheet, id: "invalid_png", assetPath: "assets/invalid.png" }],
      {
        existingAssetPaths: new Set(["assets/test_character.png", "assets/invalid.png"]),
        dimensionsByAssetPath: new Map([["assets/test_character.png", { width: 32, height: 32 }]])
      }
    );

    const codes = issues.map((issue) => issue.code);
    expect(codes).toContain("DUPLICATE_ID");
    expect(codes).toContain("MISSING_ASSET");
    expect(codes).toContain("INVALID_PNG");
  });

  it("reads PNG dimensions from the IHDR header", () => {
    expect(readPngDimensions(createPngHeader(128, 64))).toEqual({ width: 128, height: 64 });
    expect(readPngDimensions(new Uint8Array([1, 2, 3]))).toBeNull();
    expect(readPngDimensions(createPngHeader(0, 64))).toBeNull();
  });
});
