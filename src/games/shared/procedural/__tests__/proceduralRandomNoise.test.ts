import { Prng } from "../random/Prng";
import { randChoice, normRand, wtrand, randGaussian } from "../random/distributions";
import { Noise, loopNoise } from "../noise/Noise";

describe("Procedural Random & Noise Engine", () => {
  describe("Prng", () => {
    it("produces identical random sequences with the same seed", () => {
      const prng1 = new Prng(41873);
      const prng2 = new Prng(41873);

      const seq1 = Array.from({ length: 10 }, () => prng1.next());
      const seq2 = Array.from({ length: 10 }, () => prng2.next());

      expect(seq1).toEqual(seq2);
    });

    it("produces different sequences for different seeds", () => {
      const prng1 = new Prng(11111);
      const prng2 = new Prng(99999);

      expect(prng1.next()).not.toEqual(prng2.next());
    });

    it("forks sub-generators independently", () => {
      const master = new Prng(500);
      const forkA = master.fork("trees");
      const forkB = master.fork("mountains");

      expect(forkA.next()).not.toEqual(forkB.next());
    });
  });

  describe("Distributions", () => {
    it("randChoice selects deterministically and throws on empty array", () => {
      const prng = new Prng(123);
      const choices = ["a", "b", "c", "d"];
      const val1 = randChoice(choices, prng);

      const prngReset = new Prng(123);
      const val2 = randChoice(choices, prngReset);

      expect(val1).toBe(val2);
      expect(() => randChoice([], prng)).toThrow();
    });

    it("normRand bounds output correctly", () => {
      const prng = new Prng(456);
      for (let i = 0; i < 50; i++) {
        const val = normRand(10, 20, prng);
        expect(val).toBeGreaterThanOrEqual(10);
        expect(val).toBeLessThanOrEqual(20);
      }
    });

    it("randGaussian produces finite floats", () => {
      const prng = new Prng(789);
      for (let i = 0; i < 50; i++) {
        const g = randGaussian(prng);
        expect(Number.isFinite(g)).toBe(true);
      }
    });
  });

  describe("Noise", () => {
    it("generates deterministic noise values in expected range", () => {
      const noise1 = new Noise(999);
      const noise2 = new Noise(999);

      for (let x = 0; x < 5; x += 0.5) {
        const val1 = noise1.noise(x, x * 0.5);
        const val2 = noise2.noise(x, x * 0.5);
        expect(val1).toBeCloseTo(val2, 6);
        expect(val1).toBeGreaterThanOrEqual(0);
        expect(val1).toBeLessThanOrEqual(1);
      }
    });

    it("loopNoise perturbs point sequences without mutating original", () => {
      const noise = new Noise(1234);
      const pts = [{ x: 10, y: 10 }, { x: 20, y: 20 }];
      const perturbed = loopNoise(pts, noise);

      expect(perturbed).toHaveLength(2);
      expect(perturbed[0]).not.toEqual(pts[0]);
      expect(pts[0]).toEqual({ x: 10, y: 10 });
    });
  });
});
