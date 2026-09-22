import { MotionTrailBuffer, computeMotionTrailSegment } from "../MotionTrailBuffer";
import * as SharedVFXExports from "../SharedVFX";

describe("MotionTrailBuffer", () => {
  it("should initialize buffer with default maxPoints capacity", () => {
    const buffer = new MotionTrailBuffer(10);
    expect(buffer.getMaxPoints()).toBe(10);

    const buf = buffer.getBuffer(1);
    expect(buf.getCapacity()).toBe(10);
    expect(buf.isEmpty()).toBe(true);
  });

  it("should update entity position only when minDistanceSq threshold is reached", () => {
    const buffer = new MotionTrailBuffer(5);
    const entityId = 42;

    buffer.update(entityId, 10, 20, 4);
    const trail1 = buffer.getTrail(entityId);
    expect(trail1[0]).toEqual({ x: 10, y: 20, active: true });
    expect(trail1[1].active).toBe(false);

    // Movement less than sqrt(4) = 2 units should not record a new point
    buffer.update(entityId, 11, 20, 4);
    const trail2 = buffer.getTrail(entityId);
    expect(trail2[0]).toEqual({ x: 10, y: 20, active: true });
    expect(trail2[1].active).toBe(false);

    // Movement greater than or equal to threshold should push new point
    buffer.update(entityId, 13, 20, 4);
    const trail3 = buffer.getTrail(entityId);
    expect(trail3[0]).toEqual({ x: 13, y: 20, active: true });
    expect(trail3[1]).toEqual({ x: 10, y: 20, active: true });
  });

  it("should correctly compute segment ratio, alpha, and size via computeMotionTrailSegment", () => {
    const drawLength = 10;
    const baseSize = 20;

    const headSegment = computeMotionTrailSegment(0, drawLength, baseSize);
    expect(headSegment.ratio).toBe(1.0);
    expect(headSegment.alpha).toBeCloseTo(0.4);
    expect(headSegment.trailSize).toBeCloseTo(20);

    const midSegment = computeMotionTrailSegment(5, drawLength, baseSize);
    expect(midSegment.ratio).toBe(0.5);
    expect(midSegment.alpha).toBeCloseTo(0.2);
    expect(midSegment.trailSize).toBeCloseTo(20 * (0.3 + 0.7 * 0.5));
  });

  it("should export MotionTrailBuffer and computeMotionTrailSegment through SharedVFX module", () => {
    expect(SharedVFXExports.CircularPositionBuffer).toBeDefined();
    const buf = new SharedVFXExports.CircularPositionBuffer({ capacity: 15 });
    expect(buf.getCapacity()).toBe(15);
  });
});
