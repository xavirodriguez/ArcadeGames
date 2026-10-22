import { EffectSpec } from '../types';
import { applyDelay } from './delay';
import { applyReverb } from './reverb';
import { applyDistortion } from './distortion';
import { applyChorus } from './chorus';
import { applyBitcrush } from './bitcrush';

export function estimateEffectsTailSeconds(effects?: EffectSpec[]): number {
  if (!effects || effects.length === 0) return 0;
  let totalTail = 0;

  for (const fx of effects) {
    if (fx.type === 'delay') {
      const fb = Math.max(0.01, Math.min(0.99, fx.feedback));
      // Decay to -60 dBFS (0.001 amplitude ratio): 0.001 = fb^n => n = -3 / log10(fb)
      const numRepeats = -3 / Math.log10(fb);
      const delayTail = fx.timeSeconds * numRepeats;
      totalTail += delayTail;
    } else if (fx.type === 'reverb') {
      const roomSize = fx.roomSize ?? 0.5;
      // Decay time to -60 dBFS for Schroeder RT60 room model
      const reverbTail = 0.5 + roomSize * 2.5;
      totalTail += reverbTail;
    }
  }

  if (totalTail > 2.0) {
    if (typeof console !== 'undefined' && console.warn) {
      console.warn(`[Effects] Tail decay to -60dBFS (${totalTail.toFixed(2)}s) truncated at maximum 2.0s buffer extension ceiling.`);
    }
  }

  return Math.min(2.0, totalTail);
}

export function applyEffectsChain(
  samples: Float32Array,
  effects: EffectSpec[] | undefined,
  sampleRate: number
): Float32Array {
  if (!effects || effects.length === 0) return samples;
  let buffer = samples;

  for (const fx of effects) {
    switch (fx.type) {
      case 'delay':
        buffer = applyDelay(buffer, fx, sampleRate);
        break;
      case 'reverb':
        buffer = applyReverb(buffer, fx, sampleRate);
        break;
      case 'distortion':
        buffer = applyDistortion(buffer, fx);
        break;
      case 'chorus':
        buffer = applyChorus(buffer, fx, sampleRate);
        break;
      case 'bitcrush':
        buffer = applyBitcrush(buffer, fx);
        break;
    }
  }

  return buffer;
}
