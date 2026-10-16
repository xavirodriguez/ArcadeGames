import test from 'node:test';
import assert from 'node:assert/strict';
import { polyBlep } from '../dist/core/render.js';
import { fftRadix2 } from './helpers/fft.mjs';

function generateSawtooth(freq, sampleRate, numSamples, usePolyBlep) {
  const dt = freq / sampleRate;
  const samples = new Float32Array(numSamples);
  let phase = 0;

  for (let i = 0; i < numSamples; i++) {
    phase = (phase + dt) % 1;
    const naive = 2 * phase - 1;
    if (usePolyBlep && dt > 0 && dt < 0.5) {
      samples[i] = naive - polyBlep(phase, dt);
    } else {
      samples[i] = naive;
    }
  }
  return samples;
}

function computeNonHarmonicAliasingEnergy(samples, freq, sampleRate) {
  const { magnitudes, N } = fftRadix2(samples);
  const numBins = N / 2;
  const binWidth = sampleRate / N;

  const harmonics = [];
  for (let h = freq; h < sampleRate / 2; h += freq) {
    harmonics.push(h);
  }

  let aliasingEnergy = 0;
  for (let i = 1; i < numBins; i++) {
    const binFreq = i * binWidth;
    const isNearHarmonic = harmonics.some((h) => Math.abs(binFreq - h) <= 2.5 * binWidth);

    if (!isNearHarmonic) {
      aliasingEnergy += magnitudes[i] * magnitudes[i];
    }
  }

  return aliasingEnergy;
}

test('polyBlep reduces non-harmonic aliasing energy in high-frequency sawtooth', () => {
  const sampleRate = 22050;
  const freq = 3100;
  const numSamples = 2048;

  const naiveSamples = generateSawtooth(freq, sampleRate, numSamples, false);
  const blepSamples = generateSawtooth(freq, sampleRate, numSamples, true);

  const naiveEnergy = computeNonHarmonicAliasingEnergy(naiveSamples, freq, sampleRate);
  const blepEnergy = computeNonHarmonicAliasingEnergy(blepSamples, freq, sampleRate);

  console.log(`PolyBLEP measurement on 3.1 kHz sawtooth (sampleRate ${sampleRate} Hz):`);
  console.log(`  Naïve non-harmonic aliasing energy: ${naiveEnergy.toFixed(4)}`);
  console.log(`  PolyBLEP non-harmonic aliasing energy: ${blepEnergy.toFixed(4)}`);
  console.log(`  Energy reduction ratio: ${(blepEnergy / naiveEnergy).toFixed(4)} (${((1 - blepEnergy / naiveEnergy) * 100).toFixed(2)}% reduction)`);

  assert.ok(
    blepEnergy < naiveEnergy * 0.7,
    `PolyBLEP energy (${blepEnergy}) should be at least 30% lower than naive (${naiveEnergy})`
  );
});
