import test from 'node:test';
import assert from 'node:assert/strict';
import {
  fftRadix2,
  dftDirect,
  computePowerSpectrum,
  computeSpectralCentroid,
  analyzeAudioBuffer,
} from '../dist/core/analysis.js';

test('fftRadix2 matches dftDirect within floating point precision', () => {
  const N = 16;
  const reInput = new Float32Array(N);
  const imInput = new Float32Array(N);

  for (let i = 0; i < N; i++) {
    reInput[i] = Math.sin((2 * Math.PI * i * 3) / N) + 0.5 * Math.cos((2 * Math.PI * i * 5) / N);
  }

  const dftResult = dftDirect(reInput, imInput);

  const fftRe = new Float32Array(reInput);
  const fftIm = new Float32Array(imInput);
  fftRadix2(fftRe, fftIm);

  for (let i = 0; i < N; i++) {
    assert.ok(
      Math.abs(fftRe[i] - dftResult.re[i]) < 1e-4,
      `Real part mismatch at bin ${i}: FFT=${fftRe[i]}, DFT=${dftResult.re[i]}`
    );
    assert.ok(
      Math.abs(fftIm[i] - dftResult.im[i]) < 1e-4,
      `Imag part mismatch at bin ${i}: FFT=${fftIm[i]}, DFT=${dftResult.im[i]}`
    );
  }
});

test('fftRadix2 accurately identifies pure sine wave frequency peak', () => {
  const sampleRate = 22050;
  const freq = 1000;
  const numSamples = 256;
  const samples = new Float32Array(numSamples);

  for (let i = 0; i < numSamples; i++) {
    samples[i] = Math.sin((2 * Math.PI * freq * i) / sampleRate);
  }

  const { freqs, magPower } = computePowerSpectrum(samples, sampleRate);

  let maxIdx = 0;
  let maxPower = 0;
  for (let i = 0; i < magPower.length; i++) {
    if (magPower[i] > maxPower) {
      maxPower = magPower[i];
      maxIdx = i;
    }
  }

  const detectedFreq = freqs[maxIdx];
  assert.ok(
    Math.abs(detectedFreq - freq) < sampleRate / numSamples,
    `Detected freq (${detectedFreq}) must be close to target freq (${freq})`
  );
});

test('analyzeAudioBuffer computes audio quality metrics correctly', () => {
  const sampleRate = 22050;
  const duration = 0.1;
  const numSamples = Math.round(sampleRate * duration);
  const samples = new Float32Array(numSamples);

  for (let i = 0; i < numSamples; i++) {
    samples[i] = 0.5 * Math.sin((2 * Math.PI * 440 * i) / sampleRate);
  }

  const res = analyzeAudioBuffer('test_sine', 'ui', samples, sampleRate, duration);

  assert.equal(res.name, 'test_sine');
  assert.equal(res.category, 'ui');
  assert.ok(Math.abs(res.peak - 0.5) < 0.01, `Peak should be ~0.5, got ${res.peak}`);
  assert.equal(res.clippedSamples, 0);
  assert.ok(res.spectralCentroidHz > 0);
  assert.ok(res.bandEnergies.lowMid > 0);
});
