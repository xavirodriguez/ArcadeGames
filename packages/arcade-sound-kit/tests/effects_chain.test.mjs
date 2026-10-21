import test from 'node:test';
import assert from 'node:assert/strict';
import { render } from '../dist/core/render.js';
import { applyDelay } from '../dist/core/effects/delay.js';
import { applyReverb } from '../dist/core/effects/reverb.js';

test('delay effect with feedback < 1 decays exponentially over time', () => {
  const sampleRate = 22050;
  const input = new Float32Array(sampleRate);
  input[0] = 1.0; // impulse

  const delayed = applyDelay(
    input,
    { type: 'delay', timeSeconds: 0.1, feedback: 0.5, mix: 0.5 },
    sampleRate
  );

  const echo1Idx = Math.round(0.1 * sampleRate);
  const echo2Idx = Math.round(0.2 * sampleRate);

  assert.ok(
    delayed[echo1Idx] > delayed[echo2Idx],
    `First echo (${delayed[echo1Idx].toFixed(4)}) must be greater than second echo (${delayed[echo2Idx].toFixed(4)})`
  );
});

test('reverb tail energy in final samples is finite and below threshold', () => {
  const sampleRate = 22050;
  const input = new Float32Array(sampleRate);
  input[10] = 1.0; // impulse near start

  const reverbed = applyReverb(
    input,
    { type: 'reverb', roomSize: 0.5, dampHz: 4000, mix: 0.5 },
    sampleRate
  );

  let tailEnergy = 0;
  for (let i = sampleRate - 100; i < sampleRate; i++) {
    const val = reverbed[i];
    assert.ok(!Number.isNaN(val), 'Sample must not be NaN');
    assert.ok(Number.isFinite(val), 'Sample must be finite');
    tailEnergy += val * val;
  }

  tailEnergy = Math.sqrt(tailEnergy / 100);
  assert.ok(
    tailEnergy < 0.001,
    `Reverb tail energy (${tailEnergy.toFixed(6)}) must be decaying below threshold 0.001`
  );
});

test('effects chain executes sequentially without NaN or Infinity', async () => {
  const recipe = {
    name: 'effects_chain_test',
    category: 'ui',
    duration: 0.2,
    layers: [
      {
        kind: 'tone',
        wave: 'sawtooth',
        frequency: 440,
        level: -6,
      },
    ],
    effects: [
      { type: 'distortion', drive: 0.5, mix: 0.5 },
      { type: 'chorus', rateHz: 2, depthMs: 4, mix: 0.3 },
      { type: 'delay', timeSeconds: 0.05, feedback: 0.3, mix: 0.4 },
      { type: 'reverb', roomSize: 0.4, mix: 0.3 },
    ],
  };

  const samples = await render(recipe, { sampleRate: 22050, seed: 42 });
  assert.ok(samples.length > 22050 * 0.2, 'Buffer must be extended by effects tail');

  for (let i = 0; i < samples.length; i++) {
    const val = samples[i];
    assert.ok(!Number.isNaN(val), `Sample ${i} must not be NaN`);
    assert.ok(Number.isFinite(val), `Sample ${i} must be finite`);
  }
});
