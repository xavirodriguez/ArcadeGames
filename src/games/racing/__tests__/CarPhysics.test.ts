import { computeCarPhysics } from "../physics/CarPhysics";
import { DEFAULT_RACING_CONFIG } from "../types/RacingConfigSchema";

const neutralInput = { moveX: 0, moveY: 0, boost: false, brake: false };

describe("computeCarPhysics", () => {
  it("is deterministic for the same state, input and dt", () => {
    const a = computeCarPhysics({ rotation: 0.2 }, { vx: 80, vy: 25 }, neutralInput, DEFAULT_RACING_CONFIG, 1 / 60);
    const b = computeCarPhysics({ rotation: 0.2 }, { vx: 80, vy: 25 }, neutralInput, DEFAULT_RACING_CONFIG, 1 / 60);
    expect(b).toEqual(a);
  });

  it("accelerates along the car forward axis", () => {
    const result = computeCarPhysics({ rotation: 0 }, { vx: 0, vy: 0 }, { moveX: 0, moveY: -1, boost: false, brake: false }, DEFAULT_RACING_CONFIG, 1 / 60);
    expect(result.vx).toBeGreaterThan(0);
    expect(Math.abs(result.vy)).toBeLessThan(0.001);
  });

  it("reduces lateral velocity through grip", () => {
    const result = computeCarPhysics({ rotation: 0 }, { vx: 100, vy: 100 }, neutralInput, DEFAULT_RACING_CONFIG, 1 / 60);
    expect(Math.abs(result.vy)).toBeLessThan(100);
  });
});
