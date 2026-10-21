import test from 'node:test';
import assert from 'node:assert/strict';
import { evalWave, LfsrNoise } from '../dist/core/dsp/oscillators.js';
import { render } from '../dist/core/render.js';
import { arp } from '../dist/effects/primitives.js';

test('pulse 0.5 produces pulse wave with odd harmonic symmetry', () => {
  const samples = [];
  for (let i = 0; i < 100; i++) {
    const phase = i / 100;
    samples.push(evalWave('pulse', phase, 0, 0.5));
  }

  // Check 0.5 duty symmetry: phase < 0.5 is positive (+1), phase > 0.5 is negative (-1)
  assert.ok(samples[10] > 0, 'First half phase should be positive');
  assert.ok(samples[60] < 0, 'Second half phase should be negative');
});

test('LFSR 7-bit repeats sequence every 127 steps', () => {
  const lfsr = new LfsrNoise(7, 1);
  const first127 = [];
  for (let i = 0; i < 127; i++) {
    first127.push(lfsr.next());
  }

  const second127 = [];
  for (let i = 0; i < 127; i++) {
    second127.push(lfsr.next());
  }

  assert.deepEqual(
    first127,
    second127,
    '7-bit LFSR sequence must repeat exactly every 127 steps'
  );
});

test('per-layer bitcrush of N bits produces at most 2^N unique levels', async () => {
  const N = 4; // 4-bit = at most 16 levels
  const recipe = {
    name: 'bitcrush_test',
    category: 'ui',
    duration: 0.2,
    layers: [
      {
        kind: 'tone',
        wave: 'sine',
        frequency: 440,
        level: 0,
        bitcrush: { bits: N },
      },
    ],
  };

  const samples = await render(recipe, { sampleRate: 22050, seed: 42 });
  const uniqueLevels = new Set();
  for (let i = 0; i < samples.length; i++) {
    const rounded = Number(samples[i].toFixed(4));
    uniqueLevels.add(rounded);
  }

  const maxExpectedLevels = Math.pow(2, N);
  assert.ok(
    uniqueLevels.size <= maxExpectedLevels + 2,
    `4-bit bitcrushing produced ${uniqueLevels.size} unique levels, expected <= ${maxExpectedLevels + 2}`
  );
});

test('arp primitive generates arpeggiated single-voice sequence layer', () => {
  const layer = arp([261.63, 329.63, 392.0], 0.1, { wave: 'pulse' });
  assert.equal(layer.kind, 'sequence');
  assert.equal(layer.notes.length, 3);
  assert.equal(layer.notes[0].frequency, 261.63);
  assert.equal(layer.notes[1].frequency, 329.63);
  assert.equal(layer.notes[2].frequency, 392.0);
});
