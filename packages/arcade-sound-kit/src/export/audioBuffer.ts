/**
 * Pure Web Audio API helper: converts a Float32Array sample buffer into an AudioBuffer.
 * Uses copyToChannel when available for high performance, falling back to set().
 */
export function renderToAudioBuffer(
  ctx: AudioContext,
  samples: Float32Array,
  sampleRate: number
): AudioBuffer {
  if (!ctx || typeof ctx.createBuffer !== 'function') {
    throw new Error('Valid AudioContext required for renderToAudioBuffer');
  }

  const buffer = ctx.createBuffer(1, samples.length, sampleRate);
  const pcm = new Float32Array(samples);
  if (typeof buffer.copyToChannel === 'function') {
    buffer.copyToChannel(pcm, 0);
  } else {
    const channel = buffer.getChannelData(0);
    channel.set(pcm);
  }

  return buffer;
}
