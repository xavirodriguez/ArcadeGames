import test from 'node:test';
import assert from 'node:assert/strict';
import { BiquadFilter } from '../dist/core/dsp/biquad.js';

test('BiquadFilter.update recalculates coefficients when Q or sampleRate change', () => {
  const filter = new BiquadFilter();
  filter.update('lowpass', 1000, 22050, 0.707);
  const coeff1 = { ...filter.getCoefficients() };

  filter.update('lowpass', 1000, 22050, 5.0);
  const coeff2 = { ...filter.getCoefficients() };

  assert.notDeepEqual(coeff1, coeff2, 'Coefficients must update when Q changes');

  filter.update('lowpass', 1000, 44100, 5.0);
  const coeff3 = { ...filter.getCoefficients() };

  assert.notDeepEqual(coeff2, coeff3, 'Coefficients must update when sampleRate changes');
});

test('Lowpass filter attenuates frequency at 4*fc significantly more than at fc/4', () => {
  const sampleRate = 44100;
  const fc = 1000;
  const filterPass = new BiquadFilter();
  const filterStop = new BiquadFilter();
  filterPass.update('lowpass', fc, sampleRate);
  filterStop.update('lowpass', fc, sampleRate);

  const N = 1000;
  let rmsLow = 0;
  let rmsHigh = 0;

  for (let i = 0; i < N; i++) {
    const t = i / sampleRate;
    const sampleLow = filterPass.process(Math.sin(2 * Math.PI * (fc / 4) * t));
    const sampleHigh = filterStop.process(Math.sin(2 * Math.PI * (fc * 4) * t));
    rmsLow += sampleLow * sampleLow;
    rmsHigh += sampleHigh * sampleHigh;
  }

  rmsLow = Math.sqrt(rmsLow / N);
  rmsHigh = Math.sqrt(rmsHigh / N);

  assert.ok(
    rmsLow > rmsHigh * 5,
    `Lowpass must attenuate 4*fc (${rmsHigh.toFixed(4)}) much more than fc/4 (${rmsLow.toFixed(4)})`
  );
});

test('High Q boosts resonant peak at fc', () => {
  const sampleRate = 44100;
  const fc = 1000;

  const lowQFilter = new BiquadFilter();
  const highQFilter = new BiquadFilter();
  lowQFilter.update('lowpass', fc, sampleRate, 0.707);
  highQFilter.update('lowpass', fc, sampleRate, 10.0);

  let peakLowQ = 0;
  let peakHighQ = 0;

  for (let i = 0; i < 500; i++) {
    const t = i / sampleRate;
    const input = Math.sin(2 * Math.PI * fc * t);
    const outLow = lowQFilter.process(input);
    const outHigh = highQFilter.process(input);
    if (Math.abs(outLow) > peakLowQ) peakLowQ = Math.abs(outLow);
    if (Math.abs(outHigh) > peakHighQ) peakHighQ = Math.abs(outHigh);
  }

  assert.ok(
    peakHighQ > peakLowQ * 1.5,
    `High Q (${peakHighQ.toFixed(2)}) must boost peak at fc compared to low Q (${peakLowQ.toFixed(2)})`
  );
});

test('No NaN or Infinity when fc is near Nyquist', () => {
  const sampleRate = 22050;
  const nyquist = sampleRate / 2;
  const filter = new BiquadFilter();
  filter.update('lowpass', nyquist - 0.1, sampleRate);

  for (let i = 0; i < 100; i++) {
    const out = filter.process(1.0);
    assert.ok(!Number.isNaN(out), 'Sample must not be NaN near Nyquist');
    assert.ok(Number.isFinite(out), 'Sample must be finite near Nyquist');
  }
});
