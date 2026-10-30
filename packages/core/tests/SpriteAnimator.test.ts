import {
  createSpriteAnimator,
  stepSpriteAnimator,
  playAnimation,
  type SpriteSheetDefinition
} from "../src";

const TEST_SHEET: SpriteSheetDefinition = {
  id: "core_sprite_animator_test",
  assetPath: "assets/test.png",
  imageSource: null,
  frameWidth: 32,
  frameHeight: 32,
  animations: {
    walk: {
      name: "walk",
      frames: [
        { x: 0, y: 0, w: 32, h: 32 },
        { x: 32, y: 0, w: 32, h: 32 },
        { x: 64, y: 0, w: 32, h: 32 }
      ],
      frameDuration: 0.1,
      loop: true
    },
    attack: {
      name: "attack",
      frames: [
        { x: 0, y: 32, w: 32, h: 32 },
        { x: 32, y: 32, w: 32, h: 32 }
      ],
      frameDuration: 0.15,
      loop: false
    }
  }
};

describe("Core SpriteAnimator contract", () => {
  const lookup = (id: string) => (id === TEST_SHEET.id ? TEST_SHEET : undefined);

  it("initializes default state with type SpriteAnimator", () => {
    const animator = createSpriteAnimator(TEST_SHEET.id, "walk");
    expect(animator.type).toBe("SpriteAnimator");
    expect(animator.sheetId).toBe(TEST_SHEET.id);
    expect(animator.currentAnim).toBe("walk");
    expect(animator.frameIndex).toBe(0);
    expect(animator.timer).toBe(0);
    expect(animator.finished).toBe(false);
    expect(animator.scale).toBe(1);
    expect(animator.flipX).toBe(false);
  });

  it("progresses looping animation frames and wraps around", () => {
    const animator = createSpriteAnimator(TEST_SHEET.id, "walk");
    expect(stepSpriteAnimator(animator, 0.25, lookup)).toBe(false);
    expect(animator.frameIndex).toBe(2);
    expect(animator.timer).toBeCloseTo(0.05, 10);

    expect(stepSpriteAnimator(animator, 0.1, lookup)).toBe(false);
    expect(animator.frameIndex).toBe(0);
    expect(animator.timer).toBeCloseTo(0.05, 10);
  });

  it("handles one-shot clips and finished state", () => {
    const animator = createSpriteAnimator(TEST_SHEET.id, "attack");
    expect(stepSpriteAnimator(animator, 0.35, lookup)).toBe(true);
    expect(animator.finished).toBe(true);
    expect(animator.frameIndex).toBe(1);

    expect(stepSpriteAnimator(animator, 0.5, lookup)).toBe(false);
    expect(animator.finished).toBe(true);
    expect(animator.frameIndex).toBe(1);
  });

  it("restarts clips via playAnimation", () => {
    const animator = createSpriteAnimator(TEST_SHEET.id, "attack");
    stepSpriteAnimator(animator, 0.35, lookup);
    expect(animator.finished).toBe(true);

    playAnimation(animator, "attack", false);
    expect(animator.finished).toBe(true);

    playAnimation(animator, "attack", true);
    expect(animator.finished).toBe(false);
    expect(animator.frameIndex).toBe(0);
  });
});
