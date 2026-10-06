import { RacingParticlePool } from "../systems/RacingParticleSystem";

describe("RacingParticlePool", () => {
  test("pool initializes with fixed capacity and overwrites ring buffer without growth", () => {
    const pool = new RacingParticlePool(10, 5);
    expect(pool.skidMarks.length).toBe(10);
    expect(pool.smokeParticles.length).toBe(5);

    for (let i = 0; i < 25; i += 1) {
      pool.addSkidSegment(i, i, i + 1, i + 1, 3);
    }
    expect(pool.skidMarks.length).toBe(10);
  });

  test("particles decay over time during update tick", () => {
    const pool = new RacingParticlePool(10, 5);
    pool.addSkidSegment(0, 0, 10, 10, 3, 1.0);
    expect(pool.skidMarks[0]?.alpha).toBeGreaterThan(0);

    pool.update(1.2); // Exceed maxAge
    expect(pool.skidMarks[0]?.alpha).toBe(0);
  });
});
