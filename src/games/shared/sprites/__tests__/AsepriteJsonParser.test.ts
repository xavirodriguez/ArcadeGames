import fs from "node:fs";
import path from "node:path";
import { parseAsepriteJson } from "../pipeline/AsepriteJsonParser";
import { validateSpriteSheetDefinition } from "../SpriteManifestValidator";

describe("AsepriteJsonParser (Phase 4.1 Spike)", () => {
  const fixturePath = path.resolve(__dirname, "../../../../../scripts/sprites/fixtures/aseprite-sample.json");

  it("parses frames, durations, tags and slices from canonical Aseprite export", () => {
    const jsonStr = fs.readFileSync(fixturePath, "utf-8");
    const result = parseAsepriteJson(jsonStr, {
      id: "samurai_test",
      assetPath: "assets/sprites/enemies/samurai.atlas.png",
      frameWidth: 48,
      frameHeight: 64,
      anchor: { x: 0.5, y: 1.0 }
    });

    expect(result.id).toBe("samurai_test");
    expect(result.assetPath).toBe("assets/sprites/enemies/samurai.atlas.png");
    expect(result.frameWidth).toBe(48);
    expect(result.frameHeight).toBe(64);
    expect(result.anchor).toEqual({ x: 0.5, y: 1.0 });

    expect(result.animations.idle).toBeDefined();
    expect(result.animations.idle.frames).toHaveLength(3);
    expect(result.animations.idle.loop).toBe(true);
    expect(result.animations.idle.frameDuration).toBeCloseTo(0.12);

    expect(result.animations.attack).toBeDefined();
    expect(result.animations.attack.frames).toHaveLength(3);
    expect(result.animations.attack.loop).toBe(false);
    expect(result.animations.attack.frameDuration).toBeCloseTo(0.08);

    // Slice in frame 4 maps to relative frame 1 (4 - 3 = 1) in attack tag
    expect(result.animations.attack.events).toBeDefined();
    expect(result.animations.attack.events).toHaveLength(1);
    expect(result.animations.attack.events?.[0]).toEqual({
      frame: 1,
      type: "hitbox",
      payload: {
        bounds: { x: 40, y: 20, w: 20, h: 20 }
      }
    });

    // Validates against canonical validateSpriteSheetDefinition
    const issues = validateSpriteSheetDefinition(result, { width: 192, height: 128 });
    expect(issues).toHaveLength(0);
  });

  it("handles fallback to default animation when no frameTags exist", () => {
    const raw = {
      frames: [
        { frame: { x: 0, y: 0, w: 32, h: 32 }, duration: 100 },
        { frame: { x: 32, y: 0, w: 32, h: 32 }, duration: 100 }
      ],
      meta: {}
    };

    const result = parseAsepriteJson(raw, {
      id: "simple_sheet",
      assetPath: "assets/sprites/simple.png"
    });

    expect(result.animations.default).toBeDefined();
    expect(result.animations.default.frames).toHaveLength(2);
    expect(result.animations.default.frameDuration).toBe(0.1);
  });

  it("applies events overlay when provided", () => {
    const raw = {
      frames: [
        { frame: { x: 0, y: 0, w: 32, h: 32 }, duration: 100 },
        { frame: { x: 32, y: 0, w: 32, h: 32 }, duration: 100 }
      ],
      meta: {
        frameTags: [{ name: "cast", from: 0, to: 1 }]
      }
    };

    const result = parseAsepriteJson(raw, {
      id: "cast_sheet",
      assetPath: "assets/sprites/cast.png",
      eventsOverlay: {
        cast: [{ frame: 1, type: "vfx", payload: { effect: "sparkle" } }]
      }
    });

    expect(result.animations.cast.events).toEqual([
      { frame: 1, type: "vfx", payload: { effect: "sparkle" } }
    ]);
  });
});
