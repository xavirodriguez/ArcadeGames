import test from 'node:test';
import assert from 'node:assert/strict';
import { defineSound, noiseBurst, render, DEFAULT_SAMPLE_RATE } from '../dist/index.js';
import { fftRadix2 } from './helpers/fft.mjs';

test('noiseBurst band-pass filter isolates energy within 1-2 kHz band', async () => {
  const sampleRate = DEFAULT_SAMPLE_RATE;
  const recipe = defineSound('test_noise_band', {
    category: 'combat',
    duration: 0.3,
    layers: [
      noiseBurst({ filter: [1000, 2000], duration: 0.25, level: 0 }),
    ],
  });

  const samples = await render(recipe, { sampleRate, seed: 100 });
  const { magnitudes, N } = fftRadix2(samples);
  const binWidth = sampleRate / N;
  const numBins = N / 2;

  let inBandEnergy = 0;
  let inBandCount = 0;

  let outBandEnergy = 0;
  let outBandCount = 0;

  for (let i = 1; i < numBins; i++) {
    const binFreq = i * binWidth;
    const energy = magnitudes[i] * magnitudes[i];

    if (binFreq >= 1000 && binFreq <= 2000) {
      inBandEnergy += energy;
      inBandCount++;
    } else if (binFreq < 700 || binFreq > 2800) {
      outBandEnergy += energy;
      outBandCount++;
    }
  }

  const avgInBandPower = inBandCount > 0 ? inBandEnergy / inBandCount : 0;
  const avgOutBandPower = outBandCount > 0 ? outBandEnergy / outBandCount : 0;
  const ratio = avgInBandPower / Math.max(1e-12, avgOutBandPower);

  console.log(`Noise filter measurement (1-2 kHz band):`);
  console.log(`  Avg in-band power (1000-2000 Hz): ${avgInBandPower.toFixed(4)}`);
  console.log(`  Avg out-of-band power (<700 / >2800 Hz): ${avgOutBandPower.toFixed(4)}`);
  console.log(`  Power ratio (In-band / Out-of-band): ${ratio.toFixed(2)}x`);

  assert.ok(
    ratio >= 5.0,
    `In-band power density (${avgInBandPower}) should be at least 5x higher than out-of-band (${avgOutBandPower}), got ${ratio.toFixed(2)}x`
  );
});
