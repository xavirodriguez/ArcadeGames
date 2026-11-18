/**
 * Applies a per-sample bitcrush (bit-depth reduction with optional sample-rate
 * hold-downsampling) to a single audio sample.
 *
 * This is the per-sample counterpart of the buffer-level {@link applyBitcrush}
 * effect. Unlike that effect it does not clamp `bits`/`downsample`, mirroring
 * the inline bitcrush blocks used by the voice and noise-layer renderers.
 *
 * @param val - The input sample.
 * @param sampleCount - Index of the sample being rendered (pre-increment), used
 *   to decide when to re-quantize while downsampling.
 * @param spec - Optional bitcrush spec `{ bits?, downsample? }`. When absent the
 *   sample passes through unchanged.
 * @param state - Persistent state holding `lastVal`, the last emitted sample.
 *   Downsampled frames hold the last quantized value; `lastVal` is only updated
 *   when a new value is actually quantized.
 * @returns The (possibly crushed) output sample. `state.lastVal` is updated in
 *   place when a new value is quantized.
 */
export interface BitcrushSampleSpec {
  bits?: number;
  downsample?: number;
}

export interface BitcrushSampleState {
  lastVal: number;
}

export function applyBitcrushSample(
  val: number,
  sampleCount: number,
  spec: BitcrushSampleSpec | undefined,
  state: BitcrushSampleState
): number {
  if (!spec) return val;

  const bits = spec.bits ?? 8;
  const downsample = spec.downsample ?? 1;
  const step = 1 / Math.pow(2, bits - 1);

  if (downsample > 1) {
    if (sampleCount % downsample !== 0) {
      // Hold the last quantized value for downsampled frames.
      return state.lastVal;
    }
    const crushed = Math.round(val / step) * step;
    state.lastVal = crushed;
    return crushed;
  }

  return Math.round(val / step) * step;
}
