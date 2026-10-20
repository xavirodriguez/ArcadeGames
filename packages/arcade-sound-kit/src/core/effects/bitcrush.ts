import { BitcrushEffectSpec } from '../types';

export function applyBitcrush(
  samples: Float32Array,
  spec: BitcrushEffectSpec
): Float32Array {
  const bits = Math.max(2, Math.min(16, spec.bits ?? 8));
  const downsample = Math.max(1, Math.min(32, spec.downsample ?? 1));
  const step = 1 / Math.pow(2, bits - 1);

  const output = new Float32Array(samples.length);
  let lastVal = 0;

  for (let i = 0; i < samples.length; i++) {
    if (downsample > 1) {
      if (i % downsample !== 0) {
        output[i] = lastVal;
        continue;
      }
    }
    const val = Math.round(samples[i] / step) * step;
    lastVal = val;
    output[i] = val;
  }

  return output;
}
