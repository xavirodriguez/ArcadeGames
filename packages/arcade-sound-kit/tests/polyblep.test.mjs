import test from 'node:test';
import assert from 'node:assert/strict';
import { polyBlep } from '../dist/core/render.js';
import { fftRadix2 } from './helpers/fft.mjs';

test('polyBlep function behavior', () => {
  assert.equal(polyBlep(0, 0.1), -1);
  assert.equal(polyBlep(0.05, 0.1), -0.25);
  assert.equal(polyBlep(0.5, 0.1), 0);
  assert.equal(polyBlep(0, 0.6), 0);
});

test('polyBlep significantly reduces non-harmonic aliasing energy for 3.1 kHz sawtooth wave', () => {
  const sampleRate = 22050;
  const f = 3100;
  const dt = f / sampleRate;
  const N = 2048;

  function generateSawtooth(usePolyBlep) {
    const signal = new Float32Array(N);
    let p = 0;
    for (let i = 0; i < N; i++) {
      p = (p + dt) % 1;
      let saw = 2 * p - 1;
      if (usePolyBlep) {
        saw -= polyBlep(p, dt);
      }
      signal[i] = saw;
    }
    return signal;
  }

  const rawSignal = generateSawtooth(false);
  const blepSignal = generateSawtooth(true);

  const rawFft = fftRadix2(rawSignal);
  const blepFft = fftRadix2(blepSignal);

  function measureNonHarmonicEnergy(magnitudes) {
    let energy = 0;
    for (let i = 1; i < magnitudes.length; i++) {
      const freq = (i * sampleRate) / N;
      let isHarmonic = false;
      for (let k = 1; k <= 3; k++) {
        if (Math.abs(freq - k * f) < 60) {
          isHarmonic = true;
          break;
        }
      }
      if (!isHarmonic) {
        energy += magnitudes[i] * magnitudes[i];
      }
    }
    return energy;
  }

  const rawAliasEnergy = measureNonHarmonicEnergy(rawFft.magnitudes);
  const blepAliasEnergy = measureNonHarmonicEnergy(blepFft.magnitudes);

  assert.ok(
    rawAliasEnergy > 100000,
    `expected raw alias energy > 100000, got ${rawAliasEnergy}`
  );
  assert.ok(
    blepAliasEnergy < 10000,
    `expected PolyBLEP alias energy < 10000, got ${blepAliasEnergy}`
  );
  assert.ok(
    blepAliasEnergy < rawAliasEnergy / 10,
    `expected >10x reduction in alias energy, raw=${rawAliasEnergy}, blep=${blepAliasEnergy}`
  );
});
