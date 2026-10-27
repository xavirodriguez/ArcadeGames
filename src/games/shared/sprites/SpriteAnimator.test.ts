import {
  createSpriteAnimator,
  playAnimation,
  updateSpriteAnimator
} from "./SpriteAnimator";
import { SpriteRegistry } from "./SpriteRegistry";
import type { SpriteSheetDef } from "./SpriteTypes";

const TEST_SHEET_ID = "sprite_animator_unit_test";

const TEST_SHEET: SpriteSheetDef = {
  id: TEST_SHEET_ID,
  assetPath: "assets/sprite_animator_unit_test.png",
  imageSource: null,
  frameWidth: 16,
  frameHeight: 16,
  animations: {
    run: {
      name: "run",
      frames: [
        { x: 0, y: 0, w: 16, h: 16 },
        { x: 16, y: 0, w: 16, h: 16 },
        { x: 32, y: 0, w: 16, h: 16 },
        { x: 48, y: 0, w: 16, h: 16 }
      ],
      frameDuration: 0.1,
      loop: true
    },
    once: {
      name: "once",
      frames: [
        { x: 0, y: 16, w: 16, h: 16 },
        { x: 16, y: 16, w: 16, h: 16 }
      ],
      frameDuration: 0.1,
      loop: false
    },
    invalid: {
      name: "invalid",
      frames: [{ x: 0, y: 32, w: 16, h: 16 }],
      frameDuration: 0,
      loop: false
    }
  }
};

beforeAll(() => {
  SpriteRegistry.register(TEST_SHEET);
});

describe("SpriteAnimator", () => {
  it("catches up across multiple frame intervals without losing elapsed time", () => {
    const animator = createSpriteAnimator(TEST_SHEET_ID, "run");

    expect(updateSpriteAnimator(animator, 0.35)).toBe(false);
    expect(animator.frameIndex).toBe(3);
    expect(animator.timer).toBeCloseTo(0.05, 10);

    expect(updateSpriteAnimator(animator, 0.2)).toBe(false);
    expect(animator.frameIndex).toBe(1);
    expect(animator.timer).toBeCloseTo(0.05, 10);
  });

  it("signals a non-looping completion once and clamps to the terminal frame", () => {
    const animator = createSpriteAnimator(TEST_SHEET_ID, "once");

    expect(updateSpriteAnimator(animator, 0.25)).toBe(true);
    expect(animator.frameIndex).toBe(1);
    expect(animator.timer).toBe(0);
    expect(animator.finished).toBe(true);

    expect(updateSpriteAnimator(animator, 0.5)).toBe(false);
    expect(animator.frameIndex).toBe(1);
    expect(animator.finished).toBe(true);
  });

  it("restarts a completed clip only when playback is explicitly restarted", () => {
    const animator = createSpriteAnimator(TEST_SHEET_ID, "once");
    expect(updateSpriteAnimator(animator, 0.25)).toBe(true);

    playAnimation(animator, "once");
    expect(animator.finished).toBe(true);
    expect(animator.frameIndex).toBe(1);

    playAnimation(animator, "once", true);
    expect(animator.finished).toBe(false);
    expect(animator.frameIndex).toBe(0);
    expect(animator.timer).toBe(0);
  });

  it("ignores invalid delta times and invalid clip durations", () => {
    const animator = createSpriteAnimator(TEST_SHEET_ID, "run");

    expect(updateSpriteAnimator(animator, Number.NaN)).toBe(false);
    expect(updateSpriteAnimator(animator, Number.POSITIVE_INFINITY)).toBe(false);
    expect(updateSpriteAnimator(animator, -0.1)).toBe(false);
    expect(updateSpriteAnimator(animator, 0)).toBe(false);
    expect(animator.timer).toBe(0);

    playAnimation(animator, "invalid", true);
    expect(updateSpriteAnimator(animator, 1)).toBe(false);
    expect(animator.frameIndex).toBe(0);
    expect(animator.timer).toBe(0);
  });
});
