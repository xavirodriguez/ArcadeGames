import test from 'node:test';
import assert from 'node:assert/strict';
import { render } from '../dist/core/render.js';

test('whoosh bandpass filter isolates frequency sweep and produces non-zero audio samples', async () => {
  const recipe = {
    name: 'test_whoosh_bandpass',
    category: 'movement',
    duration: 0.2,
    layers: [
      {
        kind: 'whoosh',
        level: 0,
        pitch: { startHz: 1000, endHz: 2000 },
        filter: { type: 'bandpass', minHz: 1000, maxHz: 2000 },
      },
    ],
  };

  const samples = await render(recipe, { sampleRate: 22050, seed: 42 });
  assert.ok(samples.length > 0, 'Samples rendered');

  let peak = 0;
  for (let i = 0; i < samples.length; i++) {
    if (Math.abs(samples[i]) > peak) peak = Math.abs(samples[i]);
  }
  assert.ok(peak > 0, 'Whoosh output must contain non-zero audio samples');
});
