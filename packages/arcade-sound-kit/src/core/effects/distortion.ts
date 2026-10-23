import { DistortionEffectSpec } from '../types';

export function applyDistortion(
  samples: Float32Array,
  spec: DistortionEffectSpec
): Float32Array {
  const drive = Math.max(0.01, Math.min(1.0, spec.drive));
  const mix = Math.max(0, Math.min(1.0, spec.mix ?? 1.0));
  const output = new Float32Array(samples.length);

  const k = 1 + drive * 10;
  const tanhk = Math.tanh(k);

  for (let i = 0; i < samples.length; i++) {
    const input = samples[i];
    const distorted = Math.tanh(input * k) / tanhk;
    output[i] = input * (1 - mix) + distorted * mix;
  }

  return output;
}
