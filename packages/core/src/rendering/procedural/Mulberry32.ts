/**
 * Pure deterministic PRNG using Mulberry32 algorithm and hashing utilities.
 */

/**
 * Creates a mulberry32 PRNG function returning float in [0, 1).
 * @param seed - Unsigned 32-bit integer seed.
 * @public
 */
export function createMulberry32(seed: number): () => number {
  let s = seed >>> 0;
  return function (): number {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Hash function mapping (seed, layerIndex, chunkX) to a 32-bit unsigned integer seed.
 * @public
 */
export function hashChunkSeed(baseSeed: number, layerIndex: number, chunkX: number): number {
  let h = (baseSeed ^ (layerIndex * 0x9e3779b9) ^ (chunkX * 0x85ebca6b)) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
  h = (h ^ (h >>> 16)) >>> 0;
  return h;
}
