/**
 * Random distribution sampling utilities backed by an explicit IPrng instance.
 */
import type { IPrng } from "./Prng";

/**
 * Samples an element from a non-empty array deterministically using the provided PRNG.
 */
export function randChoice<T>(arr: readonly T[], prng: IPrng): T {
  if (arr.length === 0) {
    throw new Error("[randChoice] Cannot select from an empty array.");
  }
  const idx = Math.floor(prng.next() * arr.length);
  return arr[Math.min(idx, arr.length - 1)];
}

/**
 * Uniform float sampling in [min, max] using the provided PRNG.
 */
export function normRand(min: number, max: number, prng: IPrng): number {
  if (min > max) {
    [min, max] = [max, min];
  }
  return min + prng.next() * (max - min);
}

/**
 * Weighted rejection sampling given an acceptance probability function fn(x) -> [0, 1].
 */
export function wtrand(fn: (x: number) => number, prng: IPrng, maxAttempts = 100): number {
  for (let i = 0; i < maxAttempts; i++) {
    const x = prng.next();
    const y = prng.next();
    if (y < fn(x)) {
      return x;
    }
  }
  return prng.next();
}

/**
 * Approximate standard normal distribution sample via Box-Muller transform using the provided PRNG.
 */
export function randGaussian(prng: IPrng): number {
  let u = 0;
  let v = 0;
  while (u === 0) u = prng.next();
  while (v === 0) v = prng.next();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}
