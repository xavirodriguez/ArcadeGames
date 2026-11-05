/**
 * Deterministic, renderer-independent primitives for procedural VFX.
 *
 * These helpers deliberately avoid global randomness and mutable module state so
 * their output can be replayed, snapshotted and shared by Canvas and Skia.
 */

/** Rejects NaN and infinities at public numerical boundaries. */
export function finiteNumber(value: number, name: string): number {
  if (!Number.isFinite(value)) {
    throw new RangeError(`${name} must be a finite number; received ${value}`);
  }
  return value;
}

/** Validates a finite number that must be greater than zero. */
export function positiveNumber(value: number, name: string): number {
  finiteNumber(value, name);
  if (value <= 0) throw new RangeError(`${name} must be greater than zero`);
  return value;
}

/** Validates a finite number that may be zero but not negative. */
export function nonNegativeNumber(value: number, name: string): number {
  finiteNumber(value, name);
  if (value < 0) throw new RangeError(`${name} must not be negative`);
  return value;
}

/** Validates a safe integer greater than or equal to zero. */
export function nonNegativeInteger(value: number, name: string): number {
  finiteNumber(value, name);
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${name} must be a non-negative safe integer`);
  }
  return value;
}

/** Clamps a finite value to an ordered finite interval. */
export function clamp(value: number, min: number, max: number): number {
  finiteNumber(value, "value");
  finiteNumber(min, "min");
  finiteNumber(max, "max");
  if (min > max) throw new RangeError("min must be less than or equal to max");
  return Math.min(max, Math.max(min, value));
}

/** Linear interpolation. t is intentionally not clamped (supports extrapolation). */
export function lerp(a: number, b: number, t: number): number {
  finiteNumber(a, "a");
  finiteNumber(b, "b");
  finiteNumber(t, "t");
  return a + (b - a) * t;
}

/** Smoothstep interpolation over an ordered interval. */
export function smoothstep(edge0: number, edge1: number, value: number): number {
  finiteNumber(edge0, "edge0");
  finiteNumber(edge1, "edge1");
  finiteNumber(value, "value");
  if (edge0 === edge1) throw new RangeError("smoothstep edges must differ");
  const t = clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

/**
 * Small deterministic integer PRNG. Each call returns a value in [0, 1).
 * Use a per-effect seed; never share one instance across unrelated entities.
 */
export class DeterministicRandom {
  private state: number;

  constructor(seed: number) {
    finiteNumber(seed, "seed");
    this.state = seed >>> 0;
  }

  public nextUint32(): number {
    // Mulberry32: compact, deterministic and independent of runtime RNG.
    let t = (this.state += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return (t ^ (t >>> 14)) >>> 0;
  }

  public next(): number {
    return this.nextUint32() / 0x100000000;
  }

  public range(min: number, max: number): number {
    finiteNumber(min, "min");
    finiteNumber(max, "max");
    if (min > max) throw new RangeError("min must not exceed max");
    return min + (max - min) * this.next();
  }

  public int(minInclusive: number, maxExclusive: number): number {
    nonNegativeInteger(minInclusive, "minInclusive");
    nonNegativeInteger(maxExclusive, "maxExclusive");
    if (maxExclusive <= minInclusive) {
      throw new RangeError("maxExclusive must be greater than minInclusive");
    }
    return minInclusive + Math.floor(this.next() * (maxExclusive - minInclusive));
  }
}

/** Stateless hash for deriving independent deterministic seeds from an entity seed. */
export function deriveSeed(seed: number, stream: number): number {
  finiteNumber(seed, "seed");
  nonNegativeInteger(stream, "stream");
  let value = (seed >>> 0) ^ Math.imul(stream + 1, 0x9e3779b1);
  value ^= value >>> 16;
  value = Math.imul(value, 0x7feb352d);
  value ^= value >>> 15;
  value = Math.imul(value, 0x846ca68b);
  value ^= value >>> 16;
  return value >>> 0;
}
