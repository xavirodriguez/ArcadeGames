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
      const fb = Math.min(0.95, fx.feedback);
      totalTail += Math.min(2.0, fx.timeSeconds / Math.max(0.05, 1 - fb));
    } else if (fx.type === 'reverb') {
      const roomSize = fx.roomSize ?? 0.5;
      totalTail += Math.min(2.0, roomSize * 1.5);
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
