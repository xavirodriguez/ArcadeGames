import { Wave, FilterSpec, ModulationSpec, LfoSpec, Envelope } from '../types';
import { evalWave } from './oscillators';
import { computeEnvelope } from './envelope';
import { BiquadFilter } from './biquad';
import { RNG } from '../random';

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
  durJitter?: number;
  envelope?: Envelope;
  filter?: FilterSpec;
  modulation?: ModulationSpec;
  layerRng?: RNG;
}

export interface Voice {
  wave?: Wave;
  getFrequency: (tRel: number) => number;
}

function evalLfo(lfo: LfoSpec, tRel: number, initialPhase = 0, rng?: RNG, rateJitter = 1.0): number {
  const delay = lfo.delay ?? 0;
  const fadeIn = lfo.fadeIn ?? 0;
  if (tRel < delay) return 0;

  let fade = 1.0;
  if (fadeIn > 0 && tRel < delay + fadeIn) {
    fade = (tRel - delay) / fadeIn;
  }

  const effectiveRate = lfo.rateHz * rateJitter;
  const phaseOffset = lfo.phase ?? initialPhase;
  const currentPhase = (phaseOffset + tRel * effectiveRate) % 1;

  let val = 0;
  if (lfo.wave === 'sampleAndHold') {
    const step = Math.floor(tRel * effectiveRate);
    const stepRng = rng ? rng.fork(`sh_${step}`) : new RNG(step + 1);
    val = stepRng.centered(1);
  } else {
    val = evalWave(lfo.wave, currentPhase);
  }

  return val * fade;
}

/**
 * Renders a single oscillator voice with time-varying frequency, envelope, gain, LFO modulation,
 * exponential/multipoint envelope curves, and optional biquad filter.
 */
export function renderVoice(
  samples: Float32Array,
  voice: Voice,
  ctx: RenderVoiceContext
): void {
  const wave = voice.wave ?? 'sine';
  let phase = 0;

  const hasFilter = ctx.filter && ctx.filter.minHz > 0;
  const biquad = hasFilter ? new BiquadFilter() : null;
  const filterType = ctx.filter?.type ?? 'lowpass';
  const filterQ = ctx.filter?.q ?? 0.7071067811865475;
  const minHz = ctx.filter?.minHz ?? 1000;
  const maxHz = ctx.filter?.maxHz ?? minHz;
  const filterCurve = ctx.filter?.curve ?? 'exponential';

  const pitchLfo = ctx.modulation?.pitch;
  const ampLfo = ctx.modulation?.amp;
  const filterLfo = ctx.modulation?.filter;

  const initPitchPhase = pitchLfo?.phase ?? (ctx.layerRng ? ctx.layerRng.next() : 0);
  const initAmpPhase = ampLfo?.phase ?? (ctx.layerRng ? ctx.layerRng.next() : 0);
  const initFilterPhase = filterLfo?.phase ?? (ctx.layerRng ? ctx.layerRng.next() : 0);

  let sampleCount = 0;

  for (let i = ctx.sampleStart; i < ctx.sampleEnd; i++) {
    const tRel = (i - ctx.sampleStart) / ctx.sampleRate;
    let baseF = voice.getFrequency(tRel);

    if (pitchLfo) {
      const lfoVal = evalLfo(pitchLfo, tRel, initPitchPhase, ctx.layerRng, ctx.durJitter ?? 1.0);
      const semitones = lfoVal * pitchLfo.depth;
      baseF *= Math.pow(2, semitones / 12);
    }

    const f = Math.max(10, Math.min(baseF, ctx.sampleRate / 2 - 10));
    const dt = f / ctx.sampleRate;
    phase = (phase + dt) % 1;

    let osc = evalWave(wave, phase, dt);

    if (biquad) {
      if (sampleCount % 16 === 0) {
        const progress = ctx.dur > 0 ? Math.min(1, Math.max(0, tRel / ctx.dur)) : 1;
        let fCut = minHz;
        if (maxHz !== minHz) {
          if (filterCurve === 'linear') {
            fCut = minHz + (maxHz - minHz) * progress;
          } else {
            const safeEnd = Math.max(10, maxHz);
            const safeStart = Math.max(10, minHz);
            fCut = safeStart * Math.pow(safeEnd / safeStart, progress);
          }
        }

        if (filterLfo) {
          const lfoVal = evalLfo(filterLfo, tRel, initFilterPhase, ctx.layerRng, ctx.durJitter ?? 1.0);
          const octaves = lfoVal * filterLfo.depth;
          fCut *= Math.pow(2, octaves);
        }

        biquad.update(filterType, fCut, ctx.sampleRate, filterQ);
      }
      osc = biquad.process(osc);
    }

    let ampMod = 1.0;
    if (ampLfo) {
      const lfoVal = evalLfo(ampLfo, tRel, initAmpPhase, ctx.layerRng, ctx.durJitter ?? 1.0);
      ampMod = Math.max(0, Math.min(1, 1 + lfoVal * ampLfo.depth));
    }

    const env = computeEnvelope(
      tRel,
      ctx.attack,
      ctx.decay,
      ctx.sustain,
      ctx.release,
      ctx.dur,
      ctx.envelope?.curve ?? 'linear',
      ctx.envelope?.points
    );

    samples[i] += osc * env * ctx.gainLinear * ampMod;
    sampleCount++;
  }
}
