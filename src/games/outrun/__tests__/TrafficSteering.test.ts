import {
  circularDeltaZ,
  clampLateralX,
  computeTrafficSteerDelta,
  centrifugalDelta,
  maxRelativeTravelPerFrame
} from "../systems/TrafficSteering";

describe("circularDeltaZ", () => {
  it("returns shortest signed delta on a circular track", () => {
    expect(circularDeltaZ(0, 10, 100)).toBe(10);
    expect(circularDeltaZ(0, 90, 100)).toBe(-10);
    expect(circularDeltaZ(95, 5, 100)).toBe(10);
  });

  it("is stable across wraparound boundaries", () => {
    const L = 10000;
    expect(circularDeltaZ(L - 50, 50, L)).toBe(100);
    expect(circularDeltaZ(50, L - 50, L)).toBe(-100);
  });
});

describe("computeTrafficSteerDelta", () => {
  const track = 10000;
  const lookahead = 2000;
  const avoid = 0.35;
  const steer = 1.5;
  const dt = 1 / 60;

  it("returns 0 when no obstacles ahead", () => {
    const d = computeTrafficSteerDelta(0, 0, 5000, [], track, lookahead, avoid, steer, dt);
    expect(d).toBe(0);
  });

  it("returns 0 for faster traffic ahead (no block)", () => {
    const d = computeTrafficSteerDelta(
      0,
      0,
      3000,
      [{ z: 500, lateralX: 0, speed: 8000 }],
      track,
      lookahead,
      avoid,
      steer,
      dt
    );
    expect(d).toBe(0);
  });

  it("steers away from slower traffic on the same lane", () => {
    const d = computeTrafficSteerDelta(
      0,
      0,
      8000,
      [{ z: 400, lateralX: -0.05, speed: 2000 }],
      track,
      lookahead,
      avoid,
      steer,
      dt
    );
    expect(d).not.toBe(0);
    expect(d).toBeGreaterThan(0);
  });

  it("stronger steering when closer", () => {
    const far = computeTrafficSteerDelta(
      0,
      0,
      8000,
      [{ z: 1800, lateralX: 0, speed: 1000 }],
      track,
      lookahead,
      avoid,
      steer,
      dt
    );
    const near = computeTrafficSteerDelta(
      0,
      0,
      8000,
      [{ z: 200, lateralX: 0, speed: 1000 }],
      track,
      lookahead,
      avoid,
      steer,
      dt
    );
    expect(Math.abs(near)).toBeGreaterThan(Math.abs(far));
  });

  it("is deterministic for identical inputs", () => {
    const obs = [{ z: 300, lateralX: 0.1, speed: 1500 }];
    const a = computeTrafficSteerDelta(0, 0, 7000, obs, track, lookahead, avoid, steer, dt);
    const b = computeTrafficSteerDelta(0, 0, 7000, obs, track, lookahead, avoid, steer, dt);
    expect(a).toBe(b);
  });

  it("handles wraparound (obstacle just past track end)", () => {
    const selfZ = track - 100;
    const obsZ = 150;
    const d = computeTrafficSteerDelta(
      selfZ,
      0,
      8000,
      [{ z: obsZ, lateralX: 0, speed: 1000 }],
      track,
      lookahead,
      avoid,
      steer,
      dt
    );
    expect(d).not.toBe(0);
  });

  it("ignores obstacles outside avoidRadius laterally", () => {
    const d = computeTrafficSteerDelta(
      0,
      0,
      8000,
      [{ z: 300, lateralX: 0.9, speed: 1000 }],
      track,
      lookahead,
      0.35,
      steer,
      dt
    );
    expect(d).toBe(0);
  });
});

describe("centrifugalDelta (T4.3)", () => {
  const force = 0.3;
  const maxSpeed = 12000;
  const dt = 1 / 60;

  it("is zero on a straight (curve = 0)", () => {
    expect(centrifugalDelta(0, maxSpeed, maxSpeed, force, dt)).toBe(0);
  });

  it("positive curve pushes playerX negative", () => {
    const d = centrifugalDelta(2, maxSpeed, maxSpeed, force, dt);
    expect(d).toBeLessThan(0);
  });

  it("negative curve pushes playerX positive", () => {
    const d = centrifugalDelta(-2, maxSpeed, maxSpeed, force, dt);
    expect(d).toBeGreaterThan(0);
  });

  it("scales with speedRatio squared", () => {
    const full = Math.abs(centrifugalDelta(1, maxSpeed, maxSpeed, force, dt));
    const half = Math.abs(centrifugalDelta(1, maxSpeed * 0.5, maxSpeed, force, dt));
    const quarter = Math.abs(centrifugalDelta(1, maxSpeed * 0.25, maxSpeed, force, dt));
    expect(half).toBeCloseTo(full * 0.25, 8);
    expect(quarter).toBeCloseTo(full * 0.0625, 8);
  });

  it("single-frame delta alone cannot push beyond ±2 from center", () => {
    const d = centrifugalDelta(50, maxSpeed, maxSpeed, force, dt);
    expect(Math.abs(d)).toBeLessThan(2);
  });
});

describe("collision tunneling invariant (T4.4)", () => {
  const segmentLength = 200;
  const collisionZ = segmentLength * 0.6;
  const maxSpeed = 12000;

  it("at 60fps a full-speed frame can equal or exceed collision radius", () => {
    const travel = maxRelativeTravelPerFrame(maxSpeed, 1 / 60);
    expect(travel).toBeGreaterThan(collisionZ);
  });

  it("substeps of 4 bring step travel under collision radius at 60fps", () => {
    const travel = maxRelativeTravelPerFrame(maxSpeed, 1 / 60 / 4);
    expect(travel).toBeLessThanOrEqual(collisionZ);
  });

  it("at 30fps needs more substeps", () => {
    const travel30 = maxRelativeTravelPerFrame(maxSpeed, 1 / 30);
    expect(travel30).toBeGreaterThan(collisionZ * 2);
    const step = maxRelativeTravelPerFrame(maxSpeed, 1 / 30 / 8);
    expect(step).toBeLessThanOrEqual(collisionZ);
  });
});

describe("clampLateralX", () => {
  it("clamps to ±2 by default", () => {
    expect(clampLateralX(-3)).toBe(-2);
    expect(clampLateralX(3)).toBe(2);
    expect(clampLateralX(0.5)).toBe(0.5);
  });
});
