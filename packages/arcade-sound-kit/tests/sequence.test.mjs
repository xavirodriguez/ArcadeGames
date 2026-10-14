import test from 'node:test';
import assert from 'node:assert/strict';
import {
  defineSound,
  sequence,
  arp,
  render,
  validateRecipe,
  assertValidRecipe,
  SoundRecipeValidationError,
} from '../dist/index.js';

function findDominantFrequency(samples, sampleRate) {
  const N = samples.length;
  let maxMag = 0;
  let peakFreq = 0;

  const maxBin = Math.floor(N / 2);
  for (let k = 1; k < maxBin; k++) {
    let re = 0;
    let im = 0;
    for (let n = 0; n < N; n++) {
      const angle = (2 * Math.PI * k * n) / N;
      re += samples[n] * Math.cos(angle);
      im -= samples[n] * Math.sin(angle);
    }
    const mag = re * re + im * im;
    if (mag > maxMag) {
      maxMag = mag;
      peakFreq = (k * sampleRate) / N;
    }
  }

  return peakFreq;
}

test('sequence generates exact buffer duration and no NaN/Infinity', async () => {
  const recipe = defineSound('test_seq_dur', {
    category: 'progression',
    duration: 0.3,
    layers: [
      sequence([
        { frequency: 440, stepDuration: 0.1 },
        { frequency: 660, stepDuration: 0.1 },
        { frequency: 880, stepDuration: 0.1 },
      ]),
    ],
  });

  const sampleRate = 22050;
  const samples = await render(recipe, { sampleRate, seed: 123 });
  const expectedLength = Math.ceil(0.3 * sampleRate);

  assert.equal(samples.length, expectedLength);

  for (let i = 0; i < samples.length; i++) {
    assert.ok(!Number.isNaN(samples[i]), `sample at ${i} is NaN`);
    assert.ok(Number.isFinite(samples[i]), `sample at ${i} is not finite`);
  }
});

test('sequence rendering is strictly deterministic', async () => {
  const recipe = defineSound('test_seq_determ', {
    category: 'progression',
    duration: 0.2,
    layers: [
      arp([523.25, 659.25], 0.1, { wave: 'square' }),
    ],
  });

  const samples1 = await render(recipe, { seed: 999 });
  const samples2 = await render(recipe, { seed: 999 });

  assert.deepEqual(samples1, samples2, 'Deterministic seeds must produce identical audio');
});

test('sequence note slices match target dominant frequencies within FFT bin resolution', async () => {
  const sampleRate = 22050;
  const stepDur = 0.1; // 2205 samples per step
  const recipe = defineSound('test_seq_fft', {
    category: 'progression',
    duration: 0.2,
    layers: [
      sequence(
        [
          { frequency: 440, stepDuration: stepDur, envelope: { attack: 0.001, decay: 0.09, sustain: 0.8, release: 0.001 } },
          { frequency: 880, stepDuration: stepDur, envelope: { attack: 0.001, decay: 0.09, sustain: 0.8, release: 0.001 } },
        ],
        { wave: 'sine' }
      ),
    ],
  });

  const samples = await render(recipe, { sampleRate, seed: 42 });
  const stepSamples = Math.floor(stepDur * sampleRate);

  // Slice 1: Note 1 (440 Hz)
  const slice1 = samples.subarray(0, stepSamples);
  const domFreq1 = findDominantFrequency(slice1, sampleRate);
  assert.ok(
    Math.abs(domFreq1 - 440) <= 10,
    `Note 1 dominant frequency expected ~440 Hz, got ${domFreq1} Hz`
  );

  // Slice 2: Note 2 (880 Hz)
  const slice2 = samples.subarray(stepSamples, stepSamples * 2);
  const domFreq2 = findDominantFrequency(slice2, sampleRate);
  assert.ok(
    Math.abs(domFreq2 - 880) <= 10,
    `Note 2 dominant frequency expected ~880 Hz, got ${domFreq2} Hz`
  );
});

test('recipe validator flags invalid sequence recipes', () => {
  const invalid1 = defineSound('invalid_seq_empty', {
    category: 'progression',
    duration: 0.2,
    layers: [{ kind: 'sequence', notes: [] }],
  });

  const errs1 = validateRecipe(invalid1);
  assert.ok(errs1.some((e) => e.path.includes('notes')));

  const invalid2 = defineSound('invalid_seq_bad_freq', {
    category: 'progression',
    duration: 0.2,
    layers: [{ kind: 'sequence', notes: [{ frequency: -100, stepDuration: 0.1 }] }],
  });

  const errs2 = validateRecipe(invalid2);
  assert.ok(errs2.some((e) => e.path.includes('frequency')));

  assert.throws(
    () => assertValidRecipe(invalid2),
    SoundRecipeValidationError
  );
});
