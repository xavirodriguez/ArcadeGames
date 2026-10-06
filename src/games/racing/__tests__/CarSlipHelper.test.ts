import { computeSlip } from "../physics/CarSlipHelper";

describe("CarSlipHelper", () => {
  test("pure straight movement has high forward speed and zero slip", () => {
    const res = computeSlip({ vx: 200, vy: 0 }, 0);
    expect(res.forwardSpeed).toBeCloseTo(200);
    expect(res.lateralSpeed).toBeCloseTo(0);
    expect(res.slipLevel).toBe(0);
  });

  test("pure sideways drift returns slipLevel 2 for high lateral velocity", () => {
    const res = computeSlip({ vx: 0, vy: 120 }, 0);
    expect(res.forwardSpeed).toBeCloseTo(0);
    expect(res.lateralSpeed).toBeCloseTo(120);
    expect(res.slipLevel).toBe(2);
  });

  test("moderate cornering drift returns slipLevel 1 for medium lateral velocity", () => {
    const res = computeSlip({ vx: 50, vy: 50 }, 0);
    expect(res.lateralSpeed).toBeCloseTo(50);
    expect(res.slipLevel).toBe(1);
  });
});
