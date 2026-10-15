import {
  easeIn,
  easeInOut,
  buildEasedCurveStretch,
  expandStretch
} from "../rendering/RoadStretch";

describe("easeIn / easeInOut", () => {
  it("easeIn endpoints", () => {
    expect(easeIn(0, 10, 0)).toBe(0);
    expect(easeIn(0, 10, 1)).toBe(10);
    expect(easeIn(0, 10, 0.5)).toBeCloseTo(2.5, 8);
  });

  it("easeInOut endpoints and midpoint", () => {
    expect(easeInOut(0, 10, 0)).toBeCloseTo(0, 8);
    expect(easeInOut(0, 10, 1)).toBeCloseTo(10, 8);
    expect(easeInOut(0, 10, 0.5)).toBeCloseTo(5, 8);
  });

  it("clamps percent outside [0,1]", () => {
    expect(easeIn(0, 5, -1)).toBe(0);
    expect(easeIn(0, 5, 2)).toBe(5);
    expect(easeInOut(0, 5, -0.5)).toBeCloseTo(0, 8);
    expect(easeInOut(0, 5, 1.5)).toBeCloseTo(5, 8);
  });
});

describe("buildEasedCurveStretch", () => {
  it("hold-only reaches constant target", () => {
    const v = buildEasedCurveStretch(0, 5, 0, 3);
    expect(v).toHaveLength(5);
    expect(v.every((c) => c === 3)).toBe(true);
  });

  it("enter ramps monotonically toward target; first sample is 0", () => {
    const v = buildEasedCurveStretch(8, 4, 8, 4);
    expect(v).toHaveLength(20);
    expect(v[0]).toBeCloseTo(0, 8);
    for (let i = 1; i < 8; i++) {
      expect(v[i]).toBeGreaterThanOrEqual(v[i - 1] - 1e-12);
    }
    for (let i = 8; i < 12; i++) {
      expect(v[i]).toBe(4);
    }
    expect(v[v.length - 1]).toBeLessThan(0.5);
    for (let i = 13; i < 20; i++) {
      expect(v[i]).toBeLessThanOrEqual(v[i - 1] + 1e-12);
    }
  });

  it("continuity at enter→hold and hold→leave junctions", () => {
    const target = 5;
    const enter = 6;
    const hold = 3;
    const leave = 6;
    const v = buildEasedCurveStretch(enter, hold, leave, target);
    expect(v[enter - 1]).toBeLessThanOrEqual(target);
    expect(v[enter - 1]).toBeGreaterThan(target * 0.5);
    expect(v[enter]).toBe(target);
    expect(v[enter + hold]).toBeCloseTo(target, 8);
  });

  it("enterLen=0 yields abrupt start at target", () => {
    const v = buildEasedCurveStretch(0, 4, 4, -2);
    expect(v[0]).toBe(-2);
    expect(v.slice(0, 4).every((c) => c === -2)).toBe(true);
  });

  it("leaveLen=0 yields abrupt end at target", () => {
    const v = buildEasedCurveStretch(4, 4, 0, 2);
    expect(v[v.length - 1]).toBe(2);
  });

  it("all-zero lengths returns empty array", () => {
    expect(buildEasedCurveStretch(0, 0, 0, 9)).toEqual([]);
  });

  it("negative lengths are treated as zero", () => {
    const v = buildEasedCurveStretch(-3, 2, -1, 1);
    expect(v).toEqual([1, 1]);
  });

  it("symmetric left/right sign", () => {
    const right = buildEasedCurveStretch(5, 5, 5, 3);
    const left = buildEasedCurveStretch(5, 5, 5, -3);
    expect(left).toEqual(right.map((c) => (c === 0 ? 0 : -c)));
  });

  it("endpoints and intermediate samples maintain canonical +0 representation", () => {
    const v = buildEasedCurveStretch(5, 2, 5, -3);
    expect(v[0]).toBe(0);
    expect(Object.is(v[0], 0)).toBe(true);
    expect(Object.is(v[0], -0)).toBe(false);
  });
});

describe("expandStretch", () => {
  it("constant hill when easeHill is false/omitted", () => {
    const { curves, hills } = expandStretch({
      enter: 3,
      hold: 2,
      leave: 3,
      curve: 2,
      hill: 1.5
    });
    expect(curves).toHaveLength(8);
    expect(hills).toHaveLength(8);
    expect(hills.every((h) => h === 1.5)).toBe(true);
    expect(curves[0]).toBeCloseTo(0, 8);
  });

  it("eased hill when easeHill is true", () => {
    const { hills } = expandStretch({
      enter: 4,
      hold: 2,
      leave: 4,
      curve: 0,
      hill: 2,
      easeHill: true
    });
    expect(hills[0]).toBeCloseTo(0, 8);
    expect(hills[4]).toBe(2);
    expect(hills[5]).toBe(2);
    expect(hills[hills.length - 1]).toBeLessThan(0.5);
  });
});
