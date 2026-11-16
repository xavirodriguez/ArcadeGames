import {
  findSafeSpawnPoint,
  type SafeSpawnOptions
} from "../systems/SafeSpawn";

const baseOptions: SafeSpawnOptions = {
  seed: 1234,
  key: "wave-1",
  worldWidth: 800,
  worldHeight: 600,
  obstacles: [],
  minClearance: 150
};

function options(overrides: Partial<SafeSpawnOptions> = {}): SafeSpawnOptions {
  return { ...baseOptions, ...overrides };
}

describe("findSafeSpawnPoint", () => {
  it("generates the same first candidate for the same seed and key", () => {
    const first = findSafeSpawnPoint(options({ candidateCount: 1 }));
    const repeated = findSafeSpawnPoint(options({ candidateCount: 1 }));

    expect(first).toEqual(repeated);
    expect(first.candidateIndex).toBe(0);
    expect(first.x).toBeCloseTo(487.1814429759979, 10);
    expect(first.y).toBeCloseTo(572.1047061961144, 10);
    expect(first.clearance).toBe(Number.POSITIVE_INFINITY);
    expect(first.degraded).toBe(false);
  });

  it("derives independent positions from different seeds and typed keys", () => {
    const baseline = findSafeSpawnPoint(options({ candidateCount: 1 }));
    const otherSeed = findSafeSpawnPoint(options({ seed: 1235, candidateCount: 1 }));
    const otherStringKey = findSafeSpawnPoint(options({ key: "wave-2", candidateCount: 1 }));
    const numericKey = findSafeSpawnPoint(options({ key: 1, candidateCount: 1 }));
    const stringNumericKey = findSafeSpawnPoint(options({ key: "1", candidateCount: 1 }));

    expect([otherSeed.x, otherSeed.y]).not.toEqual([baseline.x, baseline.y]);
    expect([otherStringKey.x, otherStringKey.y]).not.toEqual([baseline.x, baseline.y]);
    expect([numericKey.x, numericKey.y]).not.toEqual([stringNumericKey.x, stringNumericKey.y]);
  });

  it("keeps generated candidates inside the half-open world bounds", () => {
    const result = findSafeSpawnPoint(options());

    expect(result.x).toBeGreaterThanOrEqual(0);
    expect(result.x).toBeLessThan(800);
    expect(result.y).toBeGreaterThanOrEqual(0);
    expect(result.y).toBeLessThan(600);
    expect(result.candidateIndex).toBeGreaterThanOrEqual(0);
    expect(result.candidateIndex).toBeLessThan(16);
  });

  it("uses the shortest wrapped distance across both world seams", () => {
    const firstCandidate = findSafeSpawnPoint(options({ candidateCount: 1 }));
    const obstacle = {
      x: (firstCandidate.x + 800 - 3) % 800,
      y: (firstCandidate.y + 600 - 4) % 600,
      radius: 2
    };

    const result = findSafeSpawnPoint(options({
      candidateCount: 1,
      obstacles: [obstacle],
      minClearance: 3
    }));

    // Wrapped center distance is hypot(3, 4) = 5; subtract the radius of 2.
    expect(result.clearance).toBeCloseTo(3, 8);
    expect(result.degraded).toBe(false);
  });

  it("subtracts obstacle radius from the toroidal center distance", () => {
    const point = findSafeSpawnPoint(options({ candidateCount: 1 }));
    const result = findSafeSpawnPoint(options({
      candidateCount: 1,
      obstacles: [{ x: point.x + 3, y: point.y + 4, radius: 2 }],
      minClearance: 0
    }));

    expect(result.clearance).toBeCloseTo(3, 8);
  });

  it("selects the greatest clearance rather than the first candidate", () => {
    const firstCandidate = findSafeSpawnPoint(options({ candidateCount: 1 }));
    const result = findSafeSpawnPoint(options({
      obstacles: [{ x: firstCandidate.x, y: firstCandidate.y, radius: 1 }],
      candidateCount: 16,
      minClearance: 150
    }));

    expect(result.candidateIndex).toBe(10);
    expect(result.x).toBeCloseTo(90.21142553538084, 10);
    expect(result.y).toBeCloseTo(285.05937815643847, 10);
    expect(result.clearance).toBeCloseTo(488.87775525758366, 8);
    expect(result.degraded).toBe(false);
  });

  it("keeps the earliest candidate when clearances tie", () => {
    const result = findSafeSpawnPoint(options({ candidateCount: 16 }));

    // With no obstacles every candidate has +Infinity clearance.
    expect(result.candidateIndex).toBe(0);
  });

  it("marks the best available point as degraded only below the threshold", () => {
    const point = findSafeSpawnPoint(options({ candidateCount: 1 }));
    const obstacle = { x: point.x + 3, y: point.y + 4, radius: 3 };

    const atThreshold = findSafeSpawnPoint(options({
      candidateCount: 1,
      obstacles: [obstacle],
      minClearance: 2
    }));
    const belowThreshold = findSafeSpawnPoint(options({
      candidateCount: 1,
      obstacles: [obstacle],
      minClearance: 2.001
    }));

    expect(atThreshold.clearance).toBeCloseTo(2, 8);
    expect(atThreshold.degraded).toBe(false);
    expect(belowThreshold.degraded).toBe(true);
  });

  it("reports degraded when every candidate violates the requested clearance", () => {
    const result = findSafeSpawnPoint(options({
      obstacles: [{ x: 400, y: 300, radius: 1000 }],
      minClearance: 150
    }));

    expect(result.clearance).toBeLessThan(150);
    expect(result.degraded).toBe(true);
  });

  it("does not mutate the obstacle input", () => {
    const obstacle = Object.freeze({ x: 100, y: 200, radius: 20 });
    const obstacles = Object.freeze([obstacle]);

    expect(() => findSafeSpawnPoint(options({ obstacles }))).not.toThrow();
    expect(obstacles).toEqual([obstacle]);
  });

  it("rejects invalid dimensions, thresholds, candidate counts and obstacle values", () => {
    expect(() => findSafeSpawnPoint(options({ worldWidth: 0 }))).toThrow(RangeError);
    expect(() => findSafeSpawnPoint(options({ worldHeight: Number.POSITIVE_INFINITY }))).toThrow(RangeError);
    expect(() => findSafeSpawnPoint(options({ minClearance: -1 }))).toThrow(RangeError);
    expect(() => findSafeSpawnPoint(options({ candidateCount: 0 }))).toThrow(RangeError);
    expect(() => findSafeSpawnPoint(options({ candidateCount: 1.5 }))).toThrow(RangeError);
    expect(() => findSafeSpawnPoint(options({ seed: Number.NaN }))).toThrow(RangeError);
    expect(() => findSafeSpawnPoint(options({ key: 1.5 }))).toThrow(RangeError);
    expect(() => findSafeSpawnPoint(options({
      obstacles: [{ x: 10, y: 10, radius: -1 }]
    }))).toThrow(RangeError);
  });
});
