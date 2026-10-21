import test from 'node:test';
import assert from 'node:assert/strict';
import { RNG } from '../dist/core/random.js';

test('variant fork generates 100% unique derived seeds for seeds 0..1000 x variants 0..4', () => {
  const seenSeeds = new Set();
  const totalCount = 1001 * 5;

  for (let s = 0; s <= 1000; s++) {
    for (let v = 0; v <= 4; v++) {
      const derivedSeed = new RNG(s).fork(v).fork('variant_seed').next();
      seenSeeds.add(derivedSeed);
    }
  }

  assert.equal(
    seenSeeds.size,
    totalCount,
    `Expected ${totalCount} unique derived seeds, got ${seenSeeds.size}`
  );
});
