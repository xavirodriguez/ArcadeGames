import test from 'node:test';
import assert from 'node:assert/strict';
import { render } from '../dist/core/render.js';
import { RNG } from '../dist/core/random.js';
import { noiseBurst, tone } from '../dist/effects/primitives.js';

test('RNG fork method produces distinct, reproducible sub-streams', () => {
  const rootRng = new RNG(12345);
  const stream0A = rootRng.fork(0);
  const stream1A = rootRng.fork(1);

  const val0 = stream0A.next();
  const val1 = stream1A.next();

  assert.notEqual(val0, val1, 'forked streams should produce different values');

  const rootRng2 = new RNG(12345);
  const stream0B = rootRng2.fork(0);
  assert.equal(val0, stream0B.next(), 'forking same subSeed is deterministic');
});

test('layer 2 output is unaffected by amount of random numbers consumed by layer 1', async () => {
  const seed = 999;

  const recipeShortLayer0 = {
    name: 'test_rng_short',
    category: 'combat',
    duration: 0.2,
    variation: { pitch: 0.05, levelDb: 1.0, duration: 0.05 },
    layers: [
      noiseBurst({ duration: 0.05 }),
      tone({ startHz: 440, endHz: 880, duration: 0.15, level: -6 }),
    ],
  };

  const recipeLongLayer0 = {
    name: 'test_rng_long',
    category: 'combat',
    duration: 0.2,
    variation: { pitch: 0.05, levelDb: 1.0, duration: 0.05 },
    layers: [
      noiseBurst({ duration: 0.25 }),
      tone({ startHz: 440, endHz: 880, duration: 0.15, level: -6 }),
    ],
  };

  const recipeLayer1OnlyShort = {
    ...recipeShortLayer0,
    layers: [recipeShortLayer0.layers[1]],
  };

  const recipeLayer1OnlyLong = {
    ...recipeLongLayer0,
    layers: [recipeLongLayer0.layers[1]],
  };

  const samplesShort = await render(recipeLayer1OnlyShort, {}, new RNG(seed));
  const samplesLong = await render(recipeLayer1OnlyLong, {}, new RNG(seed));

  assert.equal(samplesShort.length, samplesLong.length);
  for (let i = 0; i < samplesShort.length; i++) {
    assert.equal(
      samplesShort[i],
      samplesLong[i],
      `sample ${i} differs between short and long layer 0`
    );
  }
});
