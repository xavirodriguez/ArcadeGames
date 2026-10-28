import { RacingParticlePool } from "../systems/RacingParticleSystem";

describe("RacingParticlePool", () => {
  test("pool initializes with fixed capacities and overwrites ring buffers without growth", () => {
    const pool = new RacingParticlePool(10, 5, 3);
    expect(pool.skidMarks.length).toBe(10);
    expect(pool.smokeParticles.length).toBe(5);
    expect(pool.sparks.length).toBe(3);

    for (let i = 0; i < 25; i += 1) {
      pool.addSkidSegment(i, i, i + 1, i + 1, 3);
    }
    for (let i = 0; i < 8; i += 1) {
      pool.addSpark(i, i, 10, -10);
    }

    expect(pool.skidMarks.length).toBe(10);
    expect(pool.sparks.length).toBe(3);
    expect(pool.sparkCount).toBe(3);
    expect(pool.activeSparkCount).toBe(3);
    expect(pool.sparkWriteIndex).toBe(2);
  });

  test("skid marks and collision sparks decay within their configured lifetimes", () => {
    const pool = new RacingParticlePool(10, 5, 4);
    pool.addSkidSegment(0, 0, 10, 10, 3, 1.0);
    pool.addSpark(5, 5, 100, -30, 4, 0.15);

    expect(pool.skidMarks[0]?.alpha).toBeGreaterThan(0);
    expect(pool.sparks[0]?.alpha).toBe(1);

    pool.update(0.08);
    expect(pool.sparks[0]?.alpha).toBeGreaterThan(0);
    expect(pool.sparks[0]?.x).toBeGreaterThan(5);

    pool.update(1.0);
    expect(pool.skidMarks[0]?.alpha).toBe(0);
    expect(pool.sparks[0]?.alpha).toBe(0);
    expect(pool.activeSparkCount).toBe(0);
  });

  test("drift smoke particles keep their existing fade behaviour", () => {
    const pool = new RacingParticlePool(10, 5);
    pool.addSmokeParticle(0, 0, 10, -5, 4);
    expect(pool.smokeParticles[0]?.alpha).toBeGreaterThan(0);

    pool.update(0.8);
    expect(pool.smokeParticles[0]?.alpha).toBe(0);
  });
});
