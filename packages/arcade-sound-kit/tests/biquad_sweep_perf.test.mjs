import test from 'node:test';
import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { arcadePack } from '../dist/design/pack.js';
import { render, DEFAULT_SAMPLE_RATE } from '../dist/core/render.js';

test('measure arcadePack render performance with N=16 filter sweep update optimization', async () => {
  const pack = arcadePack();
  const sampleRate = DEFAULT_SAMPLE_RATE;

  const start = performance.now();
  for (let i = 0; i < 5; i++) {
    for (const recipe of pack) {
      await render(recipe, { sampleRate, seed: 42 + i });
    }
  }
  const totalMs = performance.now() - start;

  console.log(`Measured arcadePack 5x render time with N=16 filter sweep optimization: ${totalMs.toFixed(2)} ms`);
  assert.ok(totalMs > 0, 'Render time must be positive');
});
