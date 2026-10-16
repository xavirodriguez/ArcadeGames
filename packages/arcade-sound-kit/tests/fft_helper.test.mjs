import test from 'node:test';
import assert from 'node:assert/strict';
import { fftRadix2, computePowerSpectrum } from './helpers/fft.mjs';

test('fftRadix2 accurately identifies pure sine wave frequency peak', () => {
  const sampleRate = 22050;
  const N = 1024;
  const targetFreq = 1000;
  const samples = new Float32Array(N);

  for (let i = 0; i < N; i++) {
    const t = i / sampleRate;
    samples[i] = Math.sin(2 * Math.PI * targetFreq * t);
  }

  const { magnitudes } = fftRadix2(samples);
  let maxMag = -1;
  let peakBin = -1;

  for (let i = 0; i < magnitudes.length; i++) {
    if (magnitudes[i] > maxMag) {
      maxMag = magnitudes[i];
      peakBin = i;
    }
  }

  const detectedFreq = (peakBin * sampleRate) / N;
  const binResolution = sampleRate / N;

  assert.ok(
    Math.abs(detectedFreq - targetFreq) <= binResolution,
    `FFT peak at ${detectedFreq} Hz should match target ${targetFreq} Hz within resolution ${binResolution}`
  );
});

test('computePowerSpectrum returns valid dB values for positive frequencies', () => {
  const sampleRate = 22050;
  const samples = new Float32Array(512);

  for (let i = 0; i < samples.length; i++) {
    samples[i] = Math.sin((2 * Math.PI * 440 * i) / sampleRate);
  }

  const { dbSpectrum, binWidth, numBins } = computePowerSpectrum(samples, sampleRate);
  assert.equal(numBins, 256);
  assert.equal(binWidth, sampleRate / 512);

  for (let i = 0; i < numBins; i++) {
    assert.ok(Number.isFinite(dbSpectrum[i]), `dB value at bin ${i} must be finite`);
  }
});
