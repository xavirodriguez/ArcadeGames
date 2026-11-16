import {
  DEFAULT_GRAZE_MARGIN,
  DEFAULT_GRAZE_SCORE,
  evaluateGraze,
  grazeOuterRadius,
  isGrazeDistance
} from "../graze/grazeMath";

describe("Vertical Shmup graze contract (AUD-P2-01)", () => {
  const hitRadius = 10;

  it("defines annulus outside hit radius and within margin", () => {
    expect(grazeOuterRadius(hitRadius)).toBe(hitRadius + DEFAULT_GRAZE_MARGIN);
    expect(isGrazeDistance(hitRadius, hitRadius)).toBe(false);
    expect(isGrazeDistance(hitRadius + 1, hitRadius)).toBe(true);
    expect(isGrazeDistance(hitRadius + DEFAULT_GRAZE_MARGIN, hitRadius)).toBe(true);
    expect(isGrazeDistance(hitRadius + DEFAULT_GRAZE_MARGIN + 0.01, hitRadius)).toBe(false);
  });

  it("positive: near-miss grants graze without treating as hit", () => {
    const { graze, distance } = evaluateGraze({
      playerX: 0,
      playerY: 0,
      bulletX: hitRadius + 1,
      bulletY: 0,
      hitRadius
    });
    expect(distance).toBeGreaterThan(hitRadius);
    expect(graze).toBe(true);
    expect(DEFAULT_GRAZE_SCORE).toBe(10);
  });

  it("negative: overlap is hit territory, not graze", () => {
    const { graze } = evaluateGraze({
      playerX: 0,
      playerY: 0,
      bulletX: hitRadius * 0.5,
      bulletY: 0,
      hitRadius
    });
    expect(graze).toBe(false);
  });

  it("negative: far bullet is outside graze", () => {
    const { graze } = evaluateGraze({
      playerX: 0,
      playerY: 0,
      bulletX: hitRadius + DEFAULT_GRAZE_MARGIN + 5,
      bulletY: 0,
      hitRadius
    });
    expect(graze).toBe(false);
  });

  it("per-bullet-once: alreadyGrazed blocks a second credit", () => {
    const first = evaluateGraze({
      playerX: 0,
      playerY: 0,
      bulletX: hitRadius + 2,
      bulletY: 0,
      hitRadius,
      alreadyGrazed: false
    });
    const second = evaluateGraze({
      playerX: 0,
      playerY: 0,
      bulletX: hitRadius + 2,
      bulletY: 0,
      hitRadius,
      alreadyGrazed: true
    });
    expect(first.graze).toBe(true);
    expect(second.graze).toBe(false);
  });
});
