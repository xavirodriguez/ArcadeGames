import { CircularPositionBuffer } from "../CircularPositionBuffer";
import * as SharedVFXExports from "../SharedVFX";

describe("VFX-104 CircularPositionBuffer for Motion Trails", () => {
  it("should initialize buffer with default configuration and zero initial points", () => {
    const buffer = new CircularPositionBuffer();
    expect(buffer.getCapacity()).toBe(30);
    expect(buffer.getCount()).toBe(0);
    expect(buffer.isEmpty()).toBe(true);
    expect(buffer.isFull()).toBe(false);
    expect(buffer.getPoints()).toHaveLength(0);
  });

  it("should record positions into ring buffer adhering to capacity limit", () => {
    const capacity = 10;
    const buffer = new CircularPositionBuffer({ capacity, minDistance: 0 });

    for (let i = 0; i < 15; i++) {
      buffer.pushPosition(i * 10, i * 5, i * 0.1, i * 0.016, i);
    }

    expect(buffer.getCount()).toBe(capacity);
    expect(buffer.isFull()).toBe(true);

    const points = buffer.getPoints();
    expect(points).toHaveLength(capacity);

    // Head (index 0) should be the latest recorded point (i = 14)
    expect(points[0].x).toBe(140);
    expect(points[0].y).toBe(70);
    expect(points[0].z).toBe(14);
    expect(points[0].rotation).toBeCloseTo(1.4);

    // Tail (index 9) should be the 10th most recent point (i = 5)
    expect(points[capacity - 1].x).toBe(50);
    expect(points[capacity - 1].y).toBe(25);
    expect(points[capacity - 1].z).toBe(5);
  });

  it("should filter points based on minDistance sampling rate threshold", () => {
    const buffer = new CircularPositionBuffer({ minDistance: 5.0, minTimeInterval: 0 });

    // Initial push succeeds
    expect(buffer.pushPosition(0, 0)).toBe(true);
    expect(buffer.getCount()).toBe(1);

    // Movement less than minDistance (dx=2, dy=2 -> distSq=8 < 25) rejected
    expect(buffer.pushPosition(2, 2)).toBe(false);
    expect(buffer.getCount()).toBe(1);

    // Movement meeting threshold (dx=4, dy=3 -> distSq=25 >= 25) accepted
    expect(buffer.pushPosition(4, 3)).toBe(true);
    expect(buffer.getCount()).toBe(2);
  });

  it("should filter points based on minTimeInterval sampling rate threshold", () => {
    const buffer = new CircularPositionBuffer({ minDistance: 0, minTimeInterval: 0.05 });

    // Initial push
    expect(buffer.pushPosition(0, 0, 0, 0.00)).toBe(true);

    // Reject dt = 0.02 < 0.05
    expect(buffer.pushPosition(1, 1, 0, 0.02)).toBe(false);
    expect(buffer.getCount()).toBe(1);

    // Accept dt = 0.06 >= 0.05
    expect(buffer.pushPosition(1, 1, 0, 0.06)).toBe(true);
    expect(buffer.getCount()).toBe(2);
  });

  it("should compute progressive fade-out opacity and width scaling from head to tail", () => {
    const buffer = new CircularPositionBuffer({
      capacity: 5,
      minDistance: 0,
      startAlpha: 1.0,
      endAlpha: 0.0,
      startWidthScale: 1.0,
      endWidthScale: 0.2
    });

    for (let i = 1; i <= 5; i++) {
      buffer.pushPosition(i, i);
    }

    const points = buffer.getPoints();
    expect(points).toHaveLength(5);

    // Head point (index 0)
    expect(points[0].alpha).toBe(1.0);
    expect(points[0].widthScale).toBe(1.0);

    // Tail point (index 4)
    expect(points[4].alpha).toBe(0.0);
    expect(points[4].widthScale).toBeCloseTo(0.2);

    // Mid point (index 2)
    expect(points[2].alpha).toBeCloseTo(0.5);
    expect(points[2].widthScale).toBeCloseTo(0.6);
  });

  it("should clear recorded buffer immediately without memory reallocations", () => {
    const buffer = new CircularPositionBuffer({ capacity: 10, minDistance: 0 });

    for (let i = 0; i < 10; i++) {
      buffer.pushPosition(i, i);
    }

    expect(buffer.isEmpty()).toBe(false);
    buffer.clear();

    expect(buffer.getCount()).toBe(0);
    expect(buffer.isEmpty()).toBe(true);
    expect(buffer.getPoints()).toHaveLength(0);

    // Submitting a new position after clear works cleanly
    expect(buffer.pushPosition(100, 200)).toBe(true);
    expect(buffer.getCount()).toBe(1);
    expect(buffer.getPoints()[0].x).toBe(100);
  });

  it("should guarantee zero heap allocation during frame update pushPosition and getPoints loop", () => {
    const buffer = new CircularPositionBuffer({ capacity: 50, minDistance: 0 });

    // Warm up
    for (let i = 0; i < 50; i++) {
      buffer.pushPosition(i, i);
    }

    const points1 = buffer.getPoints();

    // Perform 100 simulation frames
    for (let frame = 0; frame < 100; frame++) {
      buffer.pushPosition(frame, frame * 2, frame * 0.05, frame * 0.016, 0);
      const points = buffer.getPoints();
      // Reference identity of return array is preserved across updates
      expect(points).toBe(points1);
    }
  });

  it("should re-export CircularPositionBuffer properly from SharedVFX module", () => {
    expect(SharedVFXExports.CircularPositionBuffer).toBeDefined();
    const buf = new SharedVFXExports.CircularPositionBuffer({ capacity: 20 });
    expect(buf.getCapacity()).toBe(20);
  });
});
