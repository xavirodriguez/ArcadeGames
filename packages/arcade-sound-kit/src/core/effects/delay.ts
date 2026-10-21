import { DelayEffectSpec } from '../types';
import { BiquadFilter } from '../dsp/biquad';

export function applyDelay(
  samples: Float32Array,
  spec: DelayEffectSpec,
  sampleRate: number
): Float32Array {
  const delaySamples = Math.round(spec.timeSeconds * sampleRate);
  if (delaySamples <= 0) return samples;

  const output = new Float32Array(samples);
  const feedback = Math.max(0, Math.min(0.95, spec.feedback));
  const mix = Math.max(0, Math.min(1.0, spec.mix));

  const filter = spec.cutoffHz ? new BiquadFilter() : null;
  if (filter && spec.cutoffHz) {
    filter.update('lowpass', spec.cutoffHz, sampleRate);
  }

  for (let i = delaySamples; i < samples.length; i++) {
    let delayedSample = output[i - delaySamples];
    if (filter) {
      delayedSample = filter.process(delayedSample);
    }
    const echo = delayedSample * feedback;
    output[i] = output[i] * (1 - mix) + (output[i] + echo) * mix;
  }

  return output;
}
