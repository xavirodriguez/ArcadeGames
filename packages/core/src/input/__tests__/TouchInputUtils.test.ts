import {
  clamp,
  applyDeadzone,
  applyDeadzone2D,
  normalizeAxis,
  snapDirections,
  shortestAngleDifference,
  rotateTowardsAngle,
  applyPowerResponseCurve,
  applyFramerateIndependentDrag,
  snapTo8WayAsymmetric
} from "../TouchInputUtils";

describe("TouchInputUtils", () => {
  describe("clamp", () => {
    it("clamps values correctly", () => {
      expect(clamp(5, 0, 10)).toBe(5);
      expect(clamp(-5, 0, 10)).toBe(0);
      expect(clamp(15, 0, 10)).toBe(10);
    });
  });

  describe("applyDeadzone", () => {
    it("returns 0 within deadzone and scales outside", () => {
      expect(applyDeadzone(0.1, 0.2)).toBe(0);
      expect(applyDeadzone(0.6, 0.2)).toBeCloseTo(0.5);
      expect(applyDeadzone(-0.6, 0.2)).toBeCloseTo(-0.5);
    });
  });

  describe("applyDeadzone2D", () => {
    it("handles 2D deadzone radially", () => {
      expect(applyDeadzone2D(0.1, 0.1, 0.2)).toEqual({ x: 0, y: 0 });
      const res = applyDeadzone2D(0.8, 0.0, 0.2);
      expect(res.x).toBeCloseTo(0.75);
      expect(res.y).toBeCloseTo(0);
    });
  });

  describe("shortestAngleDifference", () => {
    it("computes shortest angular difference including wrap-around", () => {
      expect(shortestAngleDifference(0, Math.PI / 2)).toBeCloseTo(Math.PI / 2);
      expect(shortestAngleDifference(0, -Math.PI / 2)).toBeCloseTo(-Math.PI / 2);
      expect(shortestAngleDifference(0.1, Math.PI * 2 - 0.1)).toBeCloseTo(-0.2);
      expect(shortestAngleDifference(Math.PI - 0.1, -Math.PI + 0.1)).toBeCloseTo(0.2);
    });
  });

  describe("rotateTowardsAngle", () => {
    it("rotates towards target by at most maxStep", () => {
      const res1 = rotateTowardsAngle(0, Math.PI / 2, 0.2);
      expect(res1).toBeCloseTo(0.2);

      const res2 = rotateTowardsAngle(0, Math.PI / 2, 2.0);
      expect(res2).toBeCloseTo(Math.PI / 2);

      const res3 = rotateTowardsAngle(Math.PI - 0.1, -Math.PI + 0.1, 0.5);
      expect(res3).toBeCloseTo(Math.PI + 0.1 - Math.PI * 2); // Wrapped correctly
    });
  });

  describe("applyPowerResponseCurve", () => {
    it("applies power response curve preserving sign", () => {
      expect(applyPowerResponseCurve(0.5, 2)).toBeCloseTo(0.25);
      expect(applyPowerResponseCurve(-0.5, 2)).toBeCloseTo(-0.25);
      expect(applyPowerResponseCurve(1.0, 2)).toBe(1.0);
    });
  });

  describe("applyFramerateIndependentDrag", () => {
    it("computes exponential drag", () => {
      expect(applyFramerateIndependentDrag(100, 0.1, 1.0)).toBeCloseTo(10);
      expect(applyFramerateIndependentDrag(100, 0.1, 0.0)).toBeCloseTo(100);
    });
  });

  describe("snapTo8WayAsymmetric", () => {
    it("snaps vectors to 8 directions with asymmetric sector angles", () => {
      expect(snapTo8WayAsymmetric(0, 0)).toEqual({ aimX: 0, aimY: 0, sector: -1 });

      // pure East
      const east = snapTo8WayAsymmetric(1, 0);
      expect(east.aimX).toBe(1);
      expect(east.aimY).toBe(0);
      expect(east.sector).toBe(0);

      // SE (diagonal)
      const se = snapTo8WayAsymmetric(1, 1);
      expect(se.aimX).toBeCloseTo(Math.SQRT1_2);
      expect(se.aimY).toBeCloseTo(Math.SQRT1_2);
      expect(se.sector).toBe(1);

      // NE (diagonal - sector 7)
      const ne = snapTo8WayAsymmetric(1, -1);
      expect(ne.aimX).toBeCloseTo(Math.SQRT1_2);
      expect(ne.aimY).toBeCloseTo(-Math.SQRT1_2);
      expect(ne.sector).toBe(7);
    });
  });
});
