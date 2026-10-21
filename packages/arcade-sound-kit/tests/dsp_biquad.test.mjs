import test from 'node:test';
import assert from 'node:assert/strict';
import { BiquadFilter } from '../dist/core/dsp/biquad.js';

test('BiquadFilter processes audio without NaN or Infinity', () => {
  const filter = new BiquadFilter();
  filter.update('lowpass', 1000, 22050);

  let output = 0;
  for (let i = 0; i < 100; i++) {
    const input = Math.sin((i / 22050) * 2 * Math.PI * 440);
    output = filter.process(input);
    assert.ok(!Number.isNaN(output), 'Output sample must not be NaN');
    assert.ok(Number.isFinite(output), 'Output sample must be finite');
  }
});
