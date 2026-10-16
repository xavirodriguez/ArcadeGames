import test from 'node:test';
import assert from 'node:assert/strict';
import { defineSound, noiseBurst, tone, render, DEFAULT_SAMPLE_RATE } from '../dist/index.js';

test('per-layer RNG isolation ensures layer 2 output is unaffected by layer 0 RNG consumption', async () => {
  const sampleRate = DEFAULT_SAMPLE_RATE;
  const seed = 12345;

  const recipeA = defineSound('test_rng_a', {
    category: 'combat',
    duration: 0.3,
    variation: { pitch: 0.1, levelDb: 1.0, duration: 0.1 },
    layers: [
      noiseBurst({ duration: 0.05 }),
      tone({ startHz: 440, endHz: 880, duration: 0.15 }),
    ],
  });

  const recipeB = defineSound('test_rng_b', {
    category: 'combat',
    duration: 0.3,
    variation: { pitch: 0.1, levelDb: 1.0, duration: 0.1 },
    layers: [
      noiseBurst({ duration: 0.25 }),
      tone({ startHz: 440, endHz: 880, duration: 0.15 }),
    ],
  });

  const samplesA = await render(recipeA, { sampleRate, seed });

  const recipeLayer1 = defineSound('test_rng_layer1_only', {
    category: 'combat',
    duration: 0.3,
    variation: { pitch: 0.1, levelDb: 1.0, duration: 0.1 },
    layers: [
      tone({ startHz: 440, endHz: 880, duration: 0.15 }),
    ],
  });

  const layer1AloneSamples = await render(recipeLayer1, { sampleRate, seed });

  const startSample = Math.floor(0.12 * sampleRate);
  const endSample = Math.floor(0.20 * sampleRate);

  const sliceA = samplesA.subarray(startSample, endSample);
  const sliceAlone = layer1AloneSamples.subarray(startSample, endSample);

  for (let i = 0; i < sliceA.length; i++) {
    assert.equal(
      sliceA[i],
      sliceAlone[i],
      `Sample ${i} in Layer 1 differed when Layer 0 consumption changed`
    );
  }
});
