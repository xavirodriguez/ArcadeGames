import { calculateBirdTiltAngle } from "../../shared/rendering/geometry";

describe("calculateBirdTiltAngle", () => {
  it("should clamp tilt angle to maxAngleDeg", () => {
    const up = calculateBirdTiltAngle(-1000, 25, 600);
    expect(up.angleDeg).toBe(-25);
    expect(up.angleRad).toBeCloseTo((-25 * Math.PI) / 180);

    const down = calculateBirdTiltAngle(1000, 25, 600);
    expect(down.angleDeg).toBe(25);
    expect(down.angleRad).toBeCloseTo((25 * Math.PI) / 180);
  });

  it("should scale linearly with vertical velocity", () => {
    const halfUp = calculateBirdTiltAngle(-300, 25, 600);
    expect(halfUp.angleDeg).toBe(-12.5);

    const zero = calculateBirdTiltAngle(0, 25, 600);
    expect(zero.angleDeg).toBe(0);
    expect(zero.angleRad).toBe(0);
  });
});
