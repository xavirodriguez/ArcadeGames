import { Wave } from '../types';
import { evalWave } from './oscillators';
import { computeEnvelope } from './envelope';

export interface RenderVoiceContext {
  sampleStart: number;
  sampleEnd: number;
  sampleRate: number;
  dur: number;
  attack: number;
  decay: number;
  sustain: number;
  release: number;
  gainLinear: number;
}

export interface Voice {
  wave?: Wave;
  getFrequency: (tRel: number) => number;
}

/**
 * Renders a single oscillator voice with time-varying frequency, envelope, and gain.
 * Consolidates the osc * env * gain accumulation loop across tonal, sequence, and chord layers.
 */
export function renderVoice(
  samples: Float32Array,
  voice: Voice,
  ctx: RenderVoiceContext
): void {
  const wave = voice.wave ?? 'sine';
  let phase = 0;

  for (let i = ctx.sampleStart; i < ctx.sampleEnd; i++) {
    const tRel = (i - ctx.sampleStart) / ctx.sampleRate;
    const f = Math.max(10, Math.min(voice.getFrequency(tRel), ctx.sampleRate / 2 - 10));
    const dt = f / ctx.sampleRate;
    phase = (phase + dt) % 1;

    const osc = evalWave(wave, phase, dt);
    const env = computeEnvelope(tRel, ctx.attack, ctx.decay, ctx.sustain, ctx.release, ctx.dur);
    samples[i] += osc * env * ctx.gainLinear;
  }
}
