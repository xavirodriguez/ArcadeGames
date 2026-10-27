import {
  HIT_RUN_CHARACTER_ANIMATIONS,
  HIT_RUN_CHARACTER_ANIMATION_DEFINITIONS,
  HIT_RUN_CHARACTER_ATLAS_COLUMNS,
  HIT_RUN_CHARACTER_ATLAS_ROWS,
  HIT_RUN_CHARACTER_CELL_SIZE,
  HIT_RUN_CHARACTER_SPRITE_SHEETS
} from "../rendering/HitRunSpriteAtlas";

const EXPECTED_CLIP_LENGTHS: Record<string, number> = {
  idle: 8,
  walk: 8,
  attack: 8,
  hurt: 6,
  death: 8
};

describe("HitRunSpriteAtlas", () => {
  it("derives the legacy ECS animation clips from the canonical rectangle definitions", () => {
    expect(Object.keys(HIT_RUN_CHARACTER_ANIMATIONS).sort()).toEqual(
      Object.keys(HIT_RUN_CHARACTER_ANIMATION_DEFINITIONS).sort()
    );

    for (const [name, canonical] of Object.entries(HIT_RUN_CHARACTER_ANIMATION_DEFINITIONS)) {
      const legacy = HIT_RUN_CHARACTER_ANIMATIONS[name];
      expect(legacy.frames).toEqual(
        canonical.frames.map((frame) =>
          (frame.y / HIT_RUN_CHARACTER_CELL_SIZE) * HIT_RUN_CHARACTER_ATLAS_COLUMNS +
          frame.x / HIT_RUN_CHARACTER_CELL_SIZE
        )
      );
      expect(legacy.frameRate).toBeCloseTo(1 / canonical.frameDuration, 12);
      expect(legacy.loop).toBe(canonical.loop);
    }
  });

  it("preserves clip lengths and the intentionally unused atlas cells", () => {
    for (const [name, expectedLength] of Object.entries(EXPECTED_CLIP_LENGTHS)) {
      expect(HIT_RUN_CHARACTER_ANIMATION_DEFINITIONS[name].frames).toHaveLength(expectedLength);
    }

    const frames = Object.values(HIT_RUN_CHARACTER_ANIMATION_DEFINITIONS)
      .flatMap((animation) => animation.frames);
    const uniqueFramePositions = new Set(frames.map((frame) => `${frame.x},${frame.y}`));

    expect(frames).toHaveLength(38);
    expect(uniqueFramePositions.size).toBe(38);
    expect(HIT_RUN_CHARACTER_ATLAS_COLUMNS * HIT_RUN_CHARACTER_ATLAS_ROWS).toBe(40);
  });

  it("keeps all three Hit&Run assets aligned with the same canonical clips and anchors", () => {
    expect(HIT_RUN_CHARACTER_SPRITE_SHEETS).toHaveLength(3);

    for (const sheet of HIT_RUN_CHARACTER_SPRITE_SHEETS) {
      expect(sheet.animations).toEqual(HIT_RUN_CHARACTER_ANIMATION_DEFINITIONS);
      expect(sheet.frameWidth).toBe(HIT_RUN_CHARACTER_CELL_SIZE);
      expect(sheet.frameHeight).toBe(HIT_RUN_CHARACTER_CELL_SIZE);
      expect(sheet.anchor).toEqual({ x: 0.5, y: 0.94 });
      expect(sheet.imageSource).toBeNull();

      for (const animation of Object.values(sheet.animations)) {
        for (const frame of animation.frames) {
          expect(frame.x).toBeGreaterThanOrEqual(0);
          expect(frame.y).toBeGreaterThanOrEqual(0);
          expect(frame.x + frame.w).toBeLessThanOrEqual(
            HIT_RUN_CHARACTER_ATLAS_COLUMNS * HIT_RUN_CHARACTER_CELL_SIZE
          );
          expect(frame.y + frame.h).toBeLessThanOrEqual(
            HIT_RUN_CHARACTER_ATLAS_ROWS * HIT_RUN_CHARACTER_CELL_SIZE
          );
        }
      }
    }
  });
});
