/**
 * Preload for Node offline generation with Tone.js.
 *
 * node-web-audio-api/polyfill.js does:
 *   globalThis.navigator.mediaDevices = ...
 * which throws when `navigator` is undefined (plain Node).
 *
 * Some pure-JS Web Audio polyfills also omit AudioBuffer.copyToChannel,
 * which Tone.Noise needs via ToneAudioBuffer.fromArray.
 *
 * Usage:
 *   node --import ./scripts/node-audio-polyfill.mjs dist/cli.js generate --pack
 */

// Minimal navigator so the Rust polyfill can attach mediaDevices.
if (typeof globalThis.navigator === 'undefined') {
  globalThis.navigator = {};
}

// Prefer the native/Rust backend; fall back to pure-JS web-audio-api.
let backend = 'node-web-audio-api';
try {
  await import('node-web-audio-api/polyfill.js');
} catch (err) {
  backend = 'web-audio-api';
  console.warn(
    '[arcade-sound-kit] node-web-audio-api polyfill failed, falling back to web-audio-api:',
    err?.message ?? err
  );
  await import('web-audio-api/polyfill');
}

// Ensure window mirrors globals (Tone / standardized-audio-context instanceof checks).
if (typeof globalThis.window === 'undefined') {
  globalThis.window = globalThis;
}
for (const key of [
  'AudioContext',
  'OfflineAudioContext',
  'AudioBuffer',
  'AudioParam',
  'AudioNode',
  'GainNode',
  'OscillatorNode',
  'BiquadFilterNode',
  'AudioBufferSourceNode',
  'DynamicsCompressorNode',
  'WaveShaperNode',
]) {
  if (globalThis[key] && !globalThis.window[key]) {
    globalThis.window[key] = globalThis[key];
  }
}

/**
 * Tone.Noise fills buffers with copyToChannel. Patch a minimal implementation
 * when the active polyfill does not provide it.
 */
function patchAudioBufferCopy(proto) {
  if (!proto) return;
  if (typeof proto.copyToChannel !== 'function') {
    proto.copyToChannel = function copyToChannel(source, channelNumber, startInChannel = 0) {
      const dest = this.getChannelData(channelNumber);
      const start = startInChannel | 0;
      const n = Math.min(source.length, dest.length - start);
      for (let i = 0; i < n; i++) dest[start + i] = source[i];
    };
  }
  if (typeof proto.copyFromChannel !== 'function') {
    proto.copyFromChannel = function copyFromChannel(destination, channelNumber, startInChannel = 0) {
      const src = this.getChannelData(channelNumber);
      const start = startInChannel | 0;
      const n = Math.min(destination.length, src.length - start);
      for (let i = 0; i < n; i++) destination[i] = src[start + i];
    };
  }
}

if (typeof globalThis.AudioBuffer !== 'undefined') {
  patchAudioBufferCopy(globalThis.AudioBuffer.prototype);
}

// Debug hint for CI / local troubleshooting.
if (process.env.ASK_DEBUG_POLYFILL) {
  console.error('[arcade-sound-kit] audio polyfill backend:', backend);
  console.error(
    '[arcade-sound-kit] OfflineAudioContext:',
    typeof globalThis.OfflineAudioContext
  );
  console.error(
    '[arcade-sound-kit] AudioBuffer.copyToChannel:',
    typeof globalThis.AudioBuffer?.prototype?.copyToChannel
  );
}
