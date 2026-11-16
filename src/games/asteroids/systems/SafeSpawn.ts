/**
 * Pure deterministic spawn-point selection for Asteroids.
 *
 * Candidate positions are derived independently from (seed, key, candidate index).
 * This helper does not read a World, consume gameplayRandom, or retain mutable state.
 */

export const DEFAULT_SAFE_SPAWN_CANDIDATES = 16;

export interface SafeSpawnObstacle {
  readonly x: number;
  readonly y: number;
  readonly radius: number;
}

export interface SafeSpawnOptions {
  readonly seed: number;
  readonly key: string | number;
  readonly worldWidth: number;
  readonly worldHeight: number;
  readonly obstacles: readonly SafeSpawnObstacle[];
  /** Minimum allowed distance from the candidate point to an obstacle's surface. */
  readonly minClearance: number;
  /** Number of stateless candidates to evaluate. Defaults to 16. */
  readonly candidateCount?: number;
}

export interface SafeSpawnResult {
  readonly x: number;
  readonly y: number;
  /** Nearest obstacle surface distance. Infinity when there are no obstacles. */
  readonly clearance: number;
  /** True only when even the best candidate is below minClearance. */
  readonly degraded: boolean;
  /** Stable zero-based index; exact clearance ties keep the lower index. */
  readonly candidateIndex: number;
}

const FNV_OFFSET_BASIS = 0x811c9dc5;
const FNV_PRIME = 0x01000193;
const KEY_DOMAIN = 0x4b455931;
const CANDIDATE_STEP = 0x9e3779b9;
const X_CHANNEL = 0xa511e9b3;
const Y_CHANNEL = 0x63d83595;

/** 32-bit avalanche mixer; all operations are specified integer operations in JS. */
function mixUint32(input: number): number {
  let value = input >>> 0;
  value ^= value >>> 16;
  value = Math.imul(value, 0x7feb352d);
  value ^= value >>> 15;
  value = Math.imul(value, 0x846ca68b);
  value ^= value >>> 16;
  return value >>> 0;
}

function fnvFeedUint32(hash: number, value: number): number {
  let next = hash;
  next = Math.imul(next ^ (value & 0xff), FNV_PRIME);
  next = Math.imul(next ^ ((value >>> 8) & 0xff), FNV_PRIME);
  next = Math.imul(next ^ ((value >>> 16) & 0xff), FNV_PRIME);
  next = Math.imul(next ^ ((value >>> 24) & 0xff), FNV_PRIME);
  return next >>> 0;
}

/** String keys are hashed as UTF-16 code units, with a type tag. */
function hashStringKey(key: string): number {
  let hash = fnvFeedUint32(FNV_OFFSET_BASIS, 0x535452);
  for (let index = 0; index < key.length; index++) {
    hash = Math.imul(hash ^ key.charCodeAt(index), FNV_PRIME);
  }
  return hash >>> 0;
}

/** Numeric keys are safe integers, encoded as tagged low/high uint32 words. */
function hashNumberKey(key: number): number {
  if (!Number.isSafeInteger(key)) {
    throw new RangeError("key must be a string or a safe integer");
  }

  let hash = fnvFeedUint32(FNV_OFFSET_BASIS, 0x4e554d);
  hash = fnvFeedUint32(hash, key >>> 0);
  hash = fnvFeedUint32(hash, Math.floor(key / 0x100000000) >>> 0);
  return hash >>> 0;
}

function hashKey(key: string | number): number {
  if (typeof key === "string") return hashStringKey(key);
  if (typeof key === "number") return hashNumberKey(key);
  throw new TypeError("key must be a string or a safe integer");
}

function assertFinite(value: number, name: string): void {
  if (!Number.isFinite(value)) {
    throw new RangeError(`${name} must be finite`);
  }
}

function assertPositive(value: number, name: string): void {
  assertFinite(value, name);
  if (value <= 0) {
    throw new RangeError(`${name} must be greater than zero`);
  }
}

function assertNonNegative(value: number, name: string): void {
  assertFinite(value, name);
  if (value < 0) {
    throw new RangeError(`${name} must not be negative`);
  }
}

/** Normalize a coordinate to [0, dimension), including negative/out-of-range values. */
function wrapCoordinate(value: number, dimension: number): number {
  const remainder = value % dimension;
  return remainder < 0 ? remainder + dimension : remainder;
}

/** Minimum axis distance on a wrapped interval. */
function toroidalAxisDistance(first: number, second: number, dimension: number): number {
  const a = wrapCoordinate(first, dimension);
  const b = wrapCoordinate(second, dimension);
  const direct = Math.abs(a - b);
  return Math.min(direct, dimension - direct);
}

function candidateSeed(seed: number, keyHash: number, candidateIndex: number): number {
  const keySeed = mixUint32(keyHash ^ KEY_DOMAIN);
  const rootSeed = mixUint32((seed >>> 0) ^ keySeed);
  return mixUint32(rootSeed ^ Math.imul(candidateIndex + 1, CANDIDATE_STEP));
}

function sampleCoordinate(candidate: number, channel: number, dimension: number): number {
  const unit = mixUint32(candidate ^ channel) / 0x100000000;
  const coordinate = unit * dimension;
  // Guard the half-open [0, dimension) contract against floating-point rounding.
  return coordinate < dimension ? coordinate : 0;
}

/**
 * Select the candidate with greatest toroidal clearance from obstacle surfaces.
 *
 * Clearance is center-to-surface distance: toroidal distance(candidate, obstacle)
 * minus obstacle.radius. The spawned object's own radius is intentionally not
 * included; callers should add it to minClearance when they need footprint spacing.
 */
export function findSafeSpawnPoint(options: SafeSpawnOptions): SafeSpawnResult {
  const {
    seed,
    key,
    worldWidth,
    worldHeight,
    obstacles,
    minClearance,
    candidateCount = DEFAULT_SAFE_SPAWN_CANDIDATES
  } = options;

  assertFinite(seed, "seed");
  assertPositive(worldWidth, "worldWidth");
  assertPositive(worldHeight, "worldHeight");
  assertNonNegative(minClearance, "minClearance");

  if (!Number.isSafeInteger(candidateCount) || candidateCount < 1) {
    throw new RangeError("candidateCount must be a positive safe integer");
  }
  if (!Array.isArray(obstacles)) {
    throw new TypeError("obstacles must be an array");
  }

  const keyHash = hashKey(key);
  for (let index = 0; index < obstacles.length; index++) {
    const obstacle = obstacles[index];
    assertFinite(obstacle.x, `obstacles[${index}].x`);
    assertFinite(obstacle.y, `obstacles[${index}].y`);
    assertNonNegative(obstacle.radius, `obstacles[${index}].radius`);
  }

  let bestX = 0;
  let bestY = 0;
  let bestClearance = Number.NEGATIVE_INFINITY;
  let bestIndex = 0;

  for (let candidateIndex = 0; candidateIndex < candidateCount; candidateIndex++) {
    const derivedSeed = candidateSeed(seed, keyHash, candidateIndex);
    const x = sampleCoordinate(derivedSeed, X_CHANNEL, worldWidth);
    const y = sampleCoordinate(derivedSeed, Y_CHANNEL, worldHeight);

    let clearance = Number.POSITIVE_INFINITY;
    for (let obstacleIndex = 0; obstacleIndex < obstacles.length; obstacleIndex++) {
      const obstacle = obstacles[obstacleIndex];
      const dx = toroidalAxisDistance(x, obstacle.x, worldWidth);
      const dy = toroidalAxisDistance(y, obstacle.y, worldHeight);
      const surfaceDistance = Math.hypot(dx, dy) - obstacle.radius;
      if (surfaceDistance < clearance) clearance = surfaceDistance;
    }

    // Strict comparison makes ties stable: the earliest candidate always wins.
    if (clearance > bestClearance) {
      bestX = x;
      bestY = y;
      bestClearance = clearance;
      bestIndex = candidateIndex;
    }
  }

  return {
    x: bestX,
    y: bestY,
    clearance: bestClearance,
    degraded: bestClearance < minClearance,
    candidateIndex: bestIndex
  };
}
