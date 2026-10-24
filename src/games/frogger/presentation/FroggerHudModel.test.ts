import { DEFAULT_FROGGER_CONFIG } from "../types/FroggerConfigSchema";
import {
  formatFroggerScore,
  getFroggerTimeLimit,
  getFroggerTimeProgress,
} from "./FroggerHudModel";

describe("formatFroggerScore", () => {
  it("pads smaller scores and separates groups of three digits", () => {
    expect(formatFroggerScore(0)).toBe("000 000");
    expect(formatFroggerScore(4250)).toBe("004 250");
    expect(formatFroggerScore(125000)).toBe("125 000");
  });

  it("supports score values above six digits without losing digits", () => {
    expect(formatFroggerScore(1234567)).toBe("1 234 567");
  });

  it("handles negative, fractional and non-finite values defensively", () => {
    expect(formatFroggerScore(-10)).toBe("000 000");
    expect(formatFroggerScore(4250.9)).toBe("004 250");
    expect(formatFroggerScore(Number.NaN)).toBe("000 000");
  });
});

describe("getFroggerTimeLimit", () => {
  it("uses the current level and configured limit reduction", () => {
    const config = {
      ...DEFAULT_FROGGER_CONFIG,
      FROG_TIME_LIMIT: 30,
      TIME_LIMIT_REDUCTION_PER_LEVEL: 3,
      MIN_TIME_LIMIT: 15,
    };

    expect(getFroggerTimeLimit(config, 1)).toBe(30);
    expect(getFroggerTimeLimit(config, 3)).toBe(24);
  });

  it("never goes below the configured minimum", () => {
    const config = {
      ...DEFAULT_FROGGER_CONFIG,
      FROG_TIME_LIMIT: 20,
      TIME_LIMIT_REDUCTION_PER_LEVEL: 5,
      MIN_TIME_LIMIT: 15,
    };

    expect(getFroggerTimeLimit(config, 5)).toBe(15);
  });
});

describe("getFroggerTimeProgress", () => {
  it("calculates and clamps the remaining time ratio", () => {
    expect(getFroggerTimeProgress(20, 30)).toBeCloseTo(2 / 3);
    expect(getFroggerTimeProgress(45, 30)).toBe(1);
    expect(getFroggerTimeProgress(-1, 30)).toBe(0);
    expect(getFroggerTimeProgress(10, 0)).toBe(0);
    expect(getFroggerTimeProgress(Number.NaN, 30)).toBe(0);
  });
});
