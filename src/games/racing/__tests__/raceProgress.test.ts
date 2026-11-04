import {
  computeDiscreteProgress,
  computeInterpolatedProgress,
  computeRaceProgress,
  projectPointOnSegment
} from "../raceProgress";

describe("raceProgress", () => {
  describe("computeDiscreteProgress", () => {
    it("returns 0 at race start", () => {
      expect(computeDiscreteProgress({ currentLap: 1, lastCheckpoint: -1 }, 4)).toBe(0);
    });

    it("advances per checkpoint", () => {
      expect(computeDiscreteProgress({ currentLap: 1, lastCheckpoint: 0 }, 4)).toBe(1);
      expect(computeDiscreteProgress({ currentLap: 1, lastCheckpoint: 2 }, 4)).toBe(3);
    });

    it("accounts for completed laps", () => {
      // finished first lap, passed checkpoint 0 of lap 2
      expect(computeDiscreteProgress({ currentLap: 2, lastCheckpoint: 0 }, 4)).toBe(5);
      expect(computeDiscreteProgress({ currentLap: 2, lastCheckpoint: -1 }, 4)).toBe(4);
    });

    it("handles zero / invalid checkpoint counts", () => {
      expect(computeDiscreteProgress({ currentLap: 1, lastCheckpoint: 0 }, 0)).toBe(0);
      expect(computeDiscreteProgress({ currentLap: 1, lastCheckpoint: 0 }, -2)).toBe(0);
    });
  });

  describe("projectPointOnSegment", () => {
    it("projects onto the middle of a horizontal segment", () => {
      const r = projectPointOnSegment(5, 3, 0, 0, 10, 0);
      expect(r.t).toBeCloseTo(0.5);
      expect(r.x).toBeCloseTo(5);
      expect(r.y).toBeCloseTo(0);
    });

    it("clamps outside the segment", () => {
      const before = projectPointOnSegment(-5, 0, 0, 0, 10, 0);
      expect(before.t).toBe(0);
      const after = projectPointOnSegment(15, 0, 0, 0, 10, 0);
      expect(after.t).toBe(1);
    });

    it("handles degenerate segments", () => {
      const r = projectPointOnSegment(3, 4, 1, 1, 1, 1);
      expect(r.t).toBe(0);
      expect(r.x).toBe(1);
      expect(r.y).toBe(1);
    });

    it("works with vertical and negative coordinates", () => {
      const r = projectPointOnSegment(2, -5, 0, 0, 0, -10);
      expect(r.t).toBeCloseTo(0.5);
      expect(r.x).toBeCloseTo(0);
      expect(r.y).toBeCloseTo(-5);
    });
  });

  describe("computeInterpolatedProgress", () => {
    const cps = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 100, y: 100 },
      { x: 0, y: 100 }
    ];

    it("returns discrete floor at race start", () => {
      const p = computeInterpolatedProgress({
        position: { x: 10, y: 0 },
        checkpointPositions: cps,
        lap: { currentLap: 1, lastCheckpoint: -1 }
      });
      expect(p).toBe(0);
    });

    it("interpolates between checkpoints", () => {
      const p = computeInterpolatedProgress({
        position: { x: 50, y: 0 },
        checkpointPositions: cps,
        lap: { currentLap: 1, lastCheckpoint: 0 }
      });
      // completed 1 checkpoint + ~0.5 along next segment
      expect(p).toBeGreaterThan(1);
      expect(p).toBeLessThan(2);
    });

    it("does not regress below discrete floor", () => {
      const discrete = computeDiscreteProgress({ currentLap: 1, lastCheckpoint: 1 }, 4);
      const p = computeInterpolatedProgress({
        position: { x: -50, y: 0 }, // far behind
        checkpointPositions: cps,
        lap: { currentLap: 1, lastCheckpoint: 1 }
      });
      expect(p).toBeGreaterThanOrEqual(discrete);
    });

    it("handles wrap from last checkpoint toward 0", () => {
      const p = computeInterpolatedProgress({
        position: { x: 0, y: 50 },
        checkpointPositions: cps,
        lap: { currentLap: 1, lastCheckpoint: 3 }
      });
      expect(p).toBeGreaterThanOrEqual(4);
    });
  });

  describe("computeRaceProgress", () => {
    it("falls back to discrete when geometry is missing", () => {
      expect(
        computeRaceProgress({ currentLap: 1, lastCheckpoint: 1 }, 4)
      ).toBe(2);
    });

    it("uses interpolation when positions provided", () => {
      const cps = [
        { x: 0, y: 0 },
        { x: 100, y: 0 }
      ];
      const p = computeRaceProgress(
        { currentLap: 1, lastCheckpoint: 0 },
        2,
        { x: 50, y: 0 },
        cps
      );
      expect(p).toBeGreaterThan(1);
      expect(p).toBeLessThan(2);
    });
  });
});
