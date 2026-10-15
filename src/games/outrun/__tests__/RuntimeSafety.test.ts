import {
  collisionSubstepsForFrame,
  findSegmentIndexAtZ,
  maxRelativeTravelPerFrame
} from "../systems/TrafficSteering";

describe("collisionSubstepsForFrame (T5.1)", () => {
  const maxSpeed = 12000;
  const segmentLength = 200;
  const collisionZ = segmentLength * 0.6;

  it("at 60fps uses at least minSubsteps and stays small", () => {
    const s = collisionSubstepsForFrame(maxSpeed, 1 / 60, collisionZ, 4, 32);
    expect(s).toBeGreaterThanOrEqual(4);
    expect(s).toBeLessThanOrEqual(8);
  });

  it("at engine maxDelta 0.25s covers full-speed travel through collisionZ", () => {
    const dt = 0.25;
    const travel = maxRelativeTravelPerFrame(maxSpeed, dt);
    expect(travel).toBe(3000);
    const s = collisionSubstepsForFrame(maxSpeed, dt, collisionZ, 4, 32);
    expect(s).toBeGreaterThanOrEqual(Math.ceil(travel / collisionZ));
    expect(s).toBeLessThanOrEqual(32);
    expect(travel / s).toBeLessThanOrEqual(collisionZ);
  });

  it("respects maxSubsteps cap", () => {
    const s = collisionSubstepsForFrame(maxSpeed, 1.0, collisionZ, 4, 16);
    expect(s).toBe(16);
  });

  it("never returns less than 1", () => {
    expect(collisionSubstepsForFrame(0, 0.016, collisionZ, 4, 32)).toBe(4);
    expect(collisionSubstepsForFrame(maxSpeed, 0, collisionZ, 1, 32)).toBe(1);
  });
});

describe("findSegmentIndexAtZ multi-segment advance (T5.1)", () => {
  const segLen = 200;
  const segments = Array.from({ length: 50 }, () => ({ length: segLen }));
  const trackLength = 50 * segLen;

  it("finds index 0 at z=0", () => {
    expect(findSegmentIndexAtZ(segments, 0, trackLength)).toBe(0);
  });

  it("finds correct index after multi-segment jump", () => {
    const z = 15 * segLen + 50;
    expect(findSegmentIndexAtZ(segments, z, trackLength)).toBe(15);
  });

  it("wraps correctly past track end", () => {
    const z = trackLength + segLen * 2 + 10;
    expect(findSegmentIndexAtZ(segments, z, trackLength)).toBe(2);
  });

  it("handles negative z wrap", () => {
    expect(findSegmentIndexAtZ(segments, -10, trackLength)).toBe(49);
  });

  it("is deterministic", () => {
    const z = 12345.6;
    expect(findSegmentIndexAtZ(segments, z, trackLength)).toBe(
      findSegmentIndexAtZ(segments, z, trackLength)
    );
  });
});
