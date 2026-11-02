import fs from "node:fs";
import path from "node:path";
import type { SpriteSheetDefinition } from "@tiny-aster/core";
import { parseAsepriteJson } from "../../../../../scripts/sprites/parsers/AsepriteJsonParser";
import { validateSpriteSheetDefinition } from "../SpriteManifestValidator";

const fixturePath = path.resolve(__dirname, "../../../../../scripts/sprites/fixtures/aseprite-sample.json");
const fixtureContent = fs.readFileSync(fixturePath, "utf-8");

function makeFrame(x: number, duration = 100) {
  return {
    frame: { x, y: 0, w: 16, h: 16 },
    rotated: false,
    trimmed: false,
    spriteSourceSize: { x: 0, y: 0, w: 16, h: 16 },
    sourceSize: { w: 16, h: 16 },
    duration
  };
}

function makeAsepriteData() {
  return {
    frames: [makeFrame(0), makeFrame(16), makeFrame(32), makeFrame(48)],
    meta: {
      size: { w: 64, h: 16 },
      frameTags: [{ name: "idle", from: 0, to: 3, direction: "forward" }]
    }
  };
}

describe("AsepriteJsonParser (Phase 4.1)", () => {
  it("parses Array frames, durations and tags without interpreting slices as gameplay events", () => {
    const parsed = parseAsepriteJson(fixtureContent, {
      frameWidth: 48,
      frameHeight: 64,
      anchor: { x: 0.5, y: 1 }
    });

    expect(parsed.frameWidth).toBe(48);
    expect(parsed.frameHeight).toBe(64);
    expect(parsed.anchor).toEqual({ x: 0.5, y: 1 });
    expect(parsed.animations.idle.frames).toHaveLength(3);
    expect(parsed.animations.idle.loop).toBe(true);
    expect(parsed.animations.idle.frameDuration).toBeCloseTo(0.12);
    expect(parsed.animations.attack.frames).toHaveLength(3);
    expect(parsed.animations.attack.loop).toBe(false);
    expect(parsed.animations.attack.frameDuration).toBeCloseTo(0.08);
    expect(parsed.animations.attack.events).toBeUndefined();

    const definition: SpriteSheetDefinition = {
      id: "samurai_test",
      assetPath: "assets/sprites/enemies/samurai.atlas.png",
      imageSource: "assets/sprites/enemies/samurai.atlas.png",
      sourceMode: "frames",
      ...parsed
    };
    expect(validateSpriteSheetDefinition(definition, { width: 192, height: 128 })).toHaveLength(0);
  });

  it("creates a default clip when frameTags are absent", () => {
    const parsed = parseAsepriteJson({
      frames: [makeFrame(0), makeFrame(16)],
      meta: { size: { w: 32, h: 16 } }
    }, {
      frameWidth: 16,
      frameHeight: 16
    });

    expect(parsed.animations.default.frames).toHaveLength(2);
    expect(parsed.animations.default.frameDuration).toBe(0.1);
    expect(parsed.animations.default.loop).toBe(true);
  });

  it("applies explicit loop overrides without deriving loop from direction", () => {
    const data = makeAsepriteData();
    data.meta.frameTags[0] = { name: "run", from: 0, to: 3, direction: "reverse" };

    const parsed = parseAsepriteJson(data, {
      frameWidth: 16,
      frameHeight: 16,
      animationOverrides: { run: { loop: false } }
    });

    expect(parsed.animations.run.loop).toBe(false);
    expect(parsed.animations.run.frames.map((frame) => frame.x)).toEqual([48, 32, 16, 0]);
  });

  it("expands ping-pong direction without duplicating endpoints", () => {
    const data = makeAsepriteData();
    data.meta.frameTags[0] = { name: "run", from: 0, to: 3, direction: "pingpong" };

    const parsed = parseAsepriteJson(data, {
      frameWidth: 16,
      frameHeight: 16,
      animationOverrides: { run: { loop: true } }
    });

    expect(parsed.animations.run.frames.map((frame) => frame.x)).toEqual([0, 16, 32, 48, 32, 16]);
  });

  it("orders Hash frames naturally and deterministically", () => {
    const parsed = parseAsepriteJson({
      frames: {
        "frame_10": makeFrame(32),
        "frame_2": makeFrame(16),
        "frame_1": makeFrame(0)
      },
      meta: {
        size: { w: 48, h: 16 },
        frameTags: [{ name: "idle", from: 0, to: 2 }]
      }
    }, {
      frameWidth: 16,
      frameHeight: 16
    });

    expect(parsed.animations.idle.frames.map((frame) => frame.x)).toEqual([0, 16, 32]);
  });

  it("rejects variable per-frame durations instead of averaging them", () => {
    const data = makeAsepriteData();
    data.frames[2] = makeFrame(32, 250);

    expect(() => parseAsepriteJson(data, {
      frameWidth: 16,
      frameHeight: 16
    })).toThrow(/variable frame durations/i);
  });

  it("rejects rotated and trimmed frames that the runtime contract cannot represent", () => {
    const rotated = makeAsepriteData();
    rotated.frames[0] = { ...makeFrame(0), rotated: true };
    expect(() => parseAsepriteJson(rotated, {
      frameWidth: 16,
      frameHeight: 16
    })).toThrow(/rotated/i);

    const trimmed = makeAsepriteData();
    trimmed.frames[0] = { ...makeFrame(0), trimmed: true };
    expect(() => parseAsepriteJson(trimmed, {
      frameWidth: 16,
      frameHeight: 16
    })).toThrow(/trimmed/i);
  });

  it("maps overlay events against the final playback frame sequence", () => {
    const parsed = parseAsepriteJson(makeAsepriteData(), {
      frameWidth: 16,
      frameHeight: 16,
      eventsOverlay: {
        idle: [{ frame: 2, type: "sfx", payload: { cue: "step" } }]
      }
    });

    expect(parsed.animations.idle.events).toEqual([
      { frame: 2, type: "sfx", payload: { cue: "step" } }
    ]);
  });

  it("rejects out-of-range events and malformed tag ranges", () => {
    expect(() => parseAsepriteJson(makeAsepriteData(), {
      frameWidth: 16,
      frameHeight: 16,
      eventsOverlay: {
        idle: [{ frame: 4, type: "hit" }]
      }
    })).toThrow(/invalid frame index/i);

    const data = makeAsepriteData();
    data.meta.frameTags[0] = { name: "idle", from: 0, to: 9, direction: "forward" };
    expect(() => parseAsepriteJson(data, {
      frameWidth: 16,
      frameHeight: 16
    })).toThrow(/invalid frametag range/i);
  });
});
