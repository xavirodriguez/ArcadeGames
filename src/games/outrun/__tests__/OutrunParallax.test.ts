import { computeCurvatureParallaxOffset } from "../rendering/OutrunVisualHelpers";

describe("computeCurvatureParallaxOffset (T3.3)", () => {
  const segLen = 200;
  const trackLength = 2000;

  it("straight road produces 0 parallax offset", () => {
    const straights = Array.from({ length: 10 }, (_, i) => ({
      length: segLen,
      curve: 0
    }));
    const offset = computeCurvatureParallaxOffset(straights, 500, trackLength);
    expect(offset).toBe(0);
    expect(Object.is(offset, 0)).toBe(true);
    expect(Object.is(offset, -0)).toBe(false);
  });

  it("left vs right curve shows exact left/right sign and magnitude symmetry", () => {
    const leftCurve = Array.from({ length: 10 }, () => ({
      length: segLen,
      curve: -4
    }));
    const rightCurve = Array.from({ length: 10 }, () => ({
      length: segLen,
      curve: 4
    }));

    const offsetLeft = computeCurvatureParallaxOffset(leftCurve, 600, trackLength, 0.05);
    const offsetRight = computeCurvatureParallaxOffset(rightCurve, 600, trackLength, 0.05);

    expect(offsetLeft).toBeLessThan(0);
    expect(offsetRight).toBeGreaterThan(0);
    expect(Math.abs(offsetLeft)).toBeCloseTo(Math.abs(offsetRight), 8);
  });

  it("is deterministic for identical inputs", () => {
    const segments = [
      { length: 200, curve: 2 },
      { length: 200, curve: 4 },
      { length: 200, curve: -1 },
      { length: 200, curve: 0 }
    ];
    const o1 = computeCurvatureParallaxOffset(segments, 350, 800, 0.05);
    const o2 = computeCurvatureParallaxOffset(segments, 350, 800, 0.05);
    expect(o1).toBe(o2);
  });

  it("wraps cleanly at trackLength boundaries", () => {
    const segments = [
      { length: 200, curve: 3 },
      { length: 200, curve: 1 }
    ];
    const oNearEnd = computeCurvatureParallaxOffset(segments, 390, 400, 0.05);
    const oWrapped = computeCurvatureParallaxOffset(segments, 790, 400, 0.05);
    expect(oNearEnd).toBeCloseTo(oWrapped, 8);
  });
});
