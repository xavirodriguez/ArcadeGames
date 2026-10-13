import test from 'node:test';
import assert from 'node:assert/strict';
import { fftRadix2 } from './helpers/fft.mjs';

test('fftRadix2 accurately identifies peak frequency of a 1000 Hz sine wave', () => {
  const sampleRate = 22050;
  const numSamples = 2048;
  const freq = 1000;
  const signal = new Float32Array(numSamples);

  for (let i = 0; i < numSamples; i++) {
    signal[i] = Math.sin((2 * Math.PI * freq * i) / sampleRate);
  }

  const { magnitudes } = fftRadix2(signal);

  let maxMag = -1;
  let maxBin = -1;
  for (let i = 0; i < magnitudes.length; i++) {
    if (magnitudes[i] > maxMag) {
      maxMag = magnitudes[i];
      maxBin = i;
    }
  }

  const measuredFreq = (maxBin * sampleRate) / (2 * magnitudes.length);
  assert.ok(
    Math.abs(measuredFreq - freq) < sampleRate / (2 * magnitudes.length),
    `expected peak near ${freq} Hz, got ${measuredFreq} Hz`
  );
});
