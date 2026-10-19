import { computeRacingSpeedMetrics } from "../RacingHudMetrics";

describe("computeRacingSpeedMetrics", () => {
  test("formats velocity magnitude and computes a normalized meter value", () => {
    expect(computeRacingSpeedMetrics(30, 40, 100)).toEqual({
      speed: 50,
      ratio: 0.5,
      display: "050"
    });
  });

  test("clamps the meter at maximum speed without clamping the readout", () => {
    expect(computeRacingSpeedMetrics(600, 0, 500)).toEqual({
      speed: 600,
      ratio: 1,
      display: "600"
    });
  });

  test("falls back safely for non-finite velocity and invalid maximum speed", () => {
    expect(computeRacingSpeedMetrics(Number.NaN, Number.POSITIVE_INFINITY, 0)).toEqual({
      speed: 0,
      ratio: 0,
      display: "000"
    });
  });
});
