import { MotionTrailBuffer, MotionTrailBase, computeMotionTrailSegment } from "../rendering/MotionTrailBuffer";
import { CanvasMotionTrail } from "../rendering/CanvasNeonUtils";
import { SkiaMotionTrail } from "../rendering/SkiaNeonUtils";

describe("MotionTrailBuffer & MotionTrailBase Characterization Tests", () => {
  it("should calculate correct segment properties", () => {
    const seg = computeMotionTrailSegment(0, 10, 20);
    expect(seg.ratio).toBe(1.0);
    expect(seg.alpha).toBe(0.4);
    expect(seg.trailSize).toBe(20);
  });

  it("should update point buffer correctly when threshold distance is reached", () => {
    const trailBase = new MotionTrailBase(10);
    const entityId = 1;

    // Initial position
    trailBase.update(entityId, 10, 20, 4);
    let trail = trailBase.getTrail(entityId);
    expect(trail[0]).toEqual({ x: 10, y: 20, active: true });
    expect(trail[1].active).toBe(false);

    // Movement below threshold (dx^2 + dy^2 = 1 + 1 = 2 < 4)
    trailBase.update(entityId, 11, 21, 4);
    trail = trailBase.getTrail(entityId);
    expect(trail[1].active).toBe(false);

    // Movement above threshold (dx^2 + dy^2 = 9 + 0 = 9 >= 4)
    trailBase.update(entityId, 14, 20, 4);
    trail = trailBase.getTrail(entityId);
    expect(trail[0]).toEqual({ x: 14, y: 20, active: true });
    expect(trail[1]).toEqual({ x: 10, y: 20, active: true });
  });

  it("CanvasMotionTrail and SkiaMotionTrail should inherit from MotionTrailBase seamlessly", () => {
    const canvasTrail = new CanvasMotionTrail(15);
    const skiaTrail = new SkiaMotionTrail(15);

    canvasTrail.update(42, 100, 200, 4);
    skiaTrail.update(42, 100, 200, 4);

    expect(canvasTrail.getTrail(42)[0]).toEqual({ x: 100, y: 200, active: true });
    expect(skiaTrail.getTrail(42)[0]).toEqual({ x: 100, y: 200, active: true });
  });
});
