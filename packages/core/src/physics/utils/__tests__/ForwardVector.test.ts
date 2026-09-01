import { getForwardVector, SHIP_FORWARD_AXIS } from "../ForwardVector";

describe("ForwardVector unit tests", () => {
  it("should define SHIP_FORWARD_AXIS as facing +X", () => {
    expect(SHIP_FORWARD_AXIS).toEqual({ x: 1, y: 0 });
  });

  it("should calculate forward vector for cardinal rotations", () => {
    // 0: +X (1, 0)
    const f0 = getForwardVector(0);
    expect(f0.x).toBeCloseTo(1, 6);
    expect(f0.y).toBeCloseTo(0, 6);

    // PI / 2: +Y (0, 1)
    const fPi2 = getForwardVector(Math.PI / 2);
    expect(fPi2.x).toBeCloseTo(0, 6);
    expect(fPi2.y).toBeCloseTo(1, 6);

    // PI: -X (-1, 0)
    const fPi = getForwardVector(Math.PI);
    expect(fPi.x).toBeCloseTo(-1, 6);
    expect(fPi.y).toBeCloseTo(0, 6);

    // -PI / 2: -Y (0, -1)
    const fNegPi2 = getForwardVector(-Math.PI / 2);
    expect(fNegPi2.x).toBeCloseTo(0, 6);
    expect(fNegPi2.y).toBeCloseTo(-1, 6);
  });
});
