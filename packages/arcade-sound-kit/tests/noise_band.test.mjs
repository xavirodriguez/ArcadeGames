import test from 'node:test';
import assert from 'node:assert/strict';
import { noiseBurst } from '../dist/effects/primitives.js';
import { render } from '../dist/core/render.js';
import { fftRadix2 } from './helpers/fft.mjs';

test('noiseBurst bandpass filter creates high in-band energy density relative to out-of-band', async () => {
  const recipe = {
    name: 'test_noise_band',
    category: 'combat',
    duration: 0.5,
    layers: [noiseBurst({ filter: [1000, 2000], decay: 0.45, level: 0 })],
  };

  const sampleRate = 22050;
  const samples = await render(recipe, { sampleRate });
  const { magnitudes } = fftRadix2(samples);
  const N = magnitudes.length * 2;

  let inBandEnergy = 0;
  let inBandBins = 0;
  let outBandEnergy = 0;
  let outBandBins = 0;

  for (let i = 1; i < magnitudes.length; i++) {
    const f = (i * sampleRate) / N;
    const magSq = magnitudes[i] * magnitudes[i];
    if (f >= 1000 && f <= 2000) {
      inBandEnergy += magSq;
      inBandBins++;
    } else if (f < 700 || f > 3000) {
      outBandEnergy += magSq;
      outBandBins++;
    }
  }

  const inBandDensity = inBandEnergy / inBandBins;
  const outBandDensity = outBandEnergy / outBandBins;
  const ratioLinear = inBandDensity / outBandDensity;

  assert.ok(
    ratioLinear > 10.0,
    `expected in-band to out-of-band energy density ratio > 10x, got ${ratioLinear.toFixed(2)}x`
  );
});
