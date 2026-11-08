/**
 * Pure bitcrush sample processor shared by voice and noise renderers.
 * Preserves the exact downsample + quantize behavior of the previous inline copies.
 * Allocation-free and deterministic.
 */
export function applyBitcrushSample(
  sample: number,
  sampleIndex: number,
  bits: number,
  downsample: number,
  lastVal: number
): { value: number; lastVal: number } {
  const step = 1 / Math.pow(2, bits - 1);
  if (downsample > 1) {
    if (sampleIndex % downsample !== 0) {
      return { value: lastVal, lastVal };
    }
    const crushed = Math.round(sample / step) * step;
    return { value: crushed, lastVal: crushed };
  }
  const crushed = Math.round(sample / step) * step;
  return { value: crushed, lastVal };
}
