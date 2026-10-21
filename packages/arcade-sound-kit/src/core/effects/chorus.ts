import { ChorusEffectSpec } from '../types';

export function applyChorus(
  samples: Float32Array,
  spec: ChorusEffectSpec,
  sampleRate: number
): Float32Array {
  const rateHz = Math.max(0.1, Math.min(10.0, spec.rateHz ?? 1.5));
  const depthMs = Math.max(1.0, Math.min(20.0, spec.depthMs ?? 5.0));
  const mix = Math.max(0, Math.min(1.0, spec.mix ?? 0.5));

  const baseDelaySamples = Math.round((depthMs / 1000) * sampleRate);
  const modDepthSamples = Math.round((depthMs / 1000) * 0.5 * sampleRate);

  const maxDelay = baseDelaySamples + modDepthSamples + 10;
  const buffer = new Float32Array(maxDelay);
  let bufIndex = 0;

  const output = new Float32Array(samples.length);

  for (let i = 0; i < samples.length; i++) {
    const input = samples[i];
    buffer[bufIndex] = input;

    const tRel = i / sampleRate;
    const lfo = Math.sin(2 * Math.PI * rateHz * tRel);
    const currentDelay = baseDelaySamples + lfo * modDepthSamples;

    const delayInt = Math.floor(currentDelay);
    const frac = currentDelay - delayInt;

    const idx1 = (bufIndex - delayInt + maxDelay) % maxDelay;
    const idx2 = (bufIndex - delayInt - 1 + maxDelay) % maxDelay;

    const delayedSample = buffer[idx1] * (1 - frac) + buffer[idx2] * frac;

    output[i] = input * (1 - mix) + delayedSample * mix;
    bufIndex = (bufIndex + 1) % maxDelay;
  }

  return output;
}
