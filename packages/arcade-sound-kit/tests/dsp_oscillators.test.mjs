import test from 'node:test';
import assert from 'node:assert/strict';
import { evalWave, polyBlep } from '../dist/core/dsp/oscillators.js';

test('evalWave evaluates sine, square, triangle, and sawtooth waves within [-1, 1] bounds', () => {
  const waves = ['sine', 'square', 'sawtooth', 'triangle'];
  for (const wave of waves) {
    for (let p = 0; p <= 1; p += 0.1) {
      const val = evalWave(wave, p, 0.01);
      assert.ok(val >= -1.001 && val <= 1.001, `Wave ${wave} at phase ${p} must be bounded in [-1, 1], got ${val}`);
    }
  }
});
