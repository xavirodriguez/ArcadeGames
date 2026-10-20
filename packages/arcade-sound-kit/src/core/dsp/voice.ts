import { Wave, FilterSpec, ModulationSpec, LfoSpec, Envelope, FmSpec, UnisonSpec } from '../types';
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
  duty?: number;
  durJitter?: number;
  envelope?: Envelope;
  filter?: FilterSpec;
  modulation?: ModulationSpec;
  fm?: FmSpec;
  unison?: UnisonSpec;
  bitcrush?: { bits?: number; downsample?: number };
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
 * FM phase modulation, Unison detuning, duty cycle, bitcrush, and optional biquad filter.
 */
export function renderVoice(
  samples: Float32Array,
  voice: Voice,
  ctx: RenderVoiceContext
): void {
  const wave = voice.wave ?? 'sine';
  const duty = ctx.duty ?? 0.5;

  const voicesCount = Math.max(1, Math.min(8, ctx.unison?.voices ?? 1));
  const unisonGainNorm = 1 / Math.sqrt(voicesCount);
  const detuneCents = ctx.unison?.detuneCents ?? 0;

  const phases = new Float64Array(voicesCount);
  const modPhases = new Float64Array(voicesCount);
  const modLastOut = new Float64Array(voicesCount);

  if (ctx.unison && ctx.layerRng) {
    for (let v = 0; v < voicesCount; v++) {
      phases[v] = ctx.layerRng.next();
      modPhases[v] = ctx.layerRng.next();
    }
  }

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
  let lastBitcrushVal = 0;

  for (let i = ctx.sampleStart; i < ctx.sampleEnd; i++) {
    const tRel = (i - ctx.sampleStart) / ctx.sampleRate;
    let baseF = voice.getFrequency(tRel);

    if (pitchLfo) {
      const lfoVal = evalLfo(pitchLfo, tRel, initPitchPhase, ctx.layerRng, ctx.durJitter ?? 1.0);
      const semitones = lfoVal * pitchLfo.depth;
      baseF *= Math.pow(2, semitones / 12);
    }

    const carrierF = Math.max(10, Math.min(baseF, ctx.sampleRate / 2 - 10));

    let oscMix = 0;

    for (let v = 0; v < voicesCount; v++) {
      let voiceF = carrierF;
      if (voicesCount > 1 && detuneCents > 0) {
        const spreadOffset = (v / (voicesCount - 1) - 0.5) * 2; // -1 to +1
        const centsOffset = spreadOffset * detuneCents;
        voiceF *= Math.pow(2, centsOffset / 1200);
      }

      voiceF = Math.max(10, Math.min(voiceF, ctx.sampleRate / 2 - 10));
      const dt = voiceF / ctx.sampleRate;
      phases[v] = (phases[v] + dt) % 1;

      let voiceOsc = 0;

      if (ctx.fm) {
        const fmRatio = ctx.fm.ratio;
        const indexEnv = ctx.fm.indexEnvelope
          ? computeEnvelope(
              tRel,
              ctx.fm.indexEnvelope.attack ?? 0.005,
              ctx.fm.indexEnvelope.decay ?? ctx.dur,
              ctx.fm.indexEnvelope.sustain ?? 0,
              ctx.fm.indexEnvelope.release ?? 0.01,
              ctx.dur,
              ctx.fm.indexEnvelope.curve ?? 'linear',
              ctx.fm.indexEnvelope.points
            )
          : 1.0;

        // Carson's rule safe index ceiling against Nyquist aliasing
        const maxSafeIndex = Math.max(1, (ctx.sampleRate * 0.45 - voiceF) / Math.max(10, voiceF * fmRatio) - 1);
        const effectiveIndex = Math.min(ctx.fm.index * indexEnv, maxSafeIndex);

        const modF = Math.max(10, Math.min(voiceF * fmRatio, ctx.sampleRate / 2 - 10));
        const modDt = modF / ctx.sampleRate;
        modPhases[v] = (modPhases[v] + modDt) % 1;

        const fb = ctx.fm.feedback ?? 0;
        const modPhaseWithFb = (modPhases[v] + (fb * modLastOut[v]) / (2 * Math.PI)) % 1;
        const modSignal = Math.sin(2 * Math.PI * modPhaseWithFb);
        modLastOut[v] = modSignal;

        const phaseMod = (phases[v] + (effectiveIndex * modSignal) / (2 * Math.PI)) % 1;
        voiceOsc = evalWave(wave, phaseMod, dt, duty);
      } else {
        voiceOsc = evalWave(wave, phases[v], dt, duty);
      }

      oscMix += voiceOsc * unisonGainNorm;
    }

    let osc = oscMix;

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

    let val = osc * env * ctx.gainLinear * ampMod;

    if (ctx.bitcrush) {
      const bits = ctx.bitcrush.bits ?? 8;
      const downsample = ctx.bitcrush.downsample ?? 1;
      const step = 1 / Math.pow(2, bits - 1);
      if (downsample > 1) {
        if (sampleCount % downsample !== 0) {
          val = lastBitcrushVal;
        } else {
          val = Math.round(val / step) * step;
          lastBitcrushVal = val;
        }
      } else {
        val = Math.round(val / step) * step;
      }
    }

    samples[i] += val;
    sampleCount++;
  }
}
