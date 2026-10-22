import { LayerSpec } from '../types';
import { LayerRendererContext } from './types';
import { BiquadFilter } from '../dsp/biquad';
import { computeEnvelope } from '../dsp/envelope';
import { LfsrNoise } from '../dsp/oscillators';

function dbToLinear(db: number): number {
  return Math.pow(10, db / 20);
}

export function renderNoiseLayer(
  samples: Float32Array,
  l: LayerSpec,
  ctx: LayerRendererContext
): void {
  const { sampleRate, pitchJitter, durJitter, levelJitter, layerRng } = ctx;
  const isWhoosh = l.kind === 'whoosh';
  const defaultLevel = -12;
  const levelVal = (l.level ?? defaultLevel) + levelJitter;

  const at = l.start ?? 0;
  const dur = Math.max(0.01, (l.duration ?? 0.1) * durJitter);
  const gainLinear = dbToLinear(levelVal);

  const attack = l.envelope?.attack ?? (isWhoosh ? 0.005 : 0.001);
  const decay = l.envelope?.decay ?? 0.08;
  const sustain = l.envelope?.sustain ?? 0;
  const release = l.envelope?.release ?? 0.01;

  const sampleStart = Math.floor(at * sampleRate);
  const sampleEnd = Math.min(
    samples.length,
    Math.floor((at + dur + release) * sampleRate)
  );

  const hpFilter = new BiquadFilter();
  const lpFilter = new BiquadFilter();

  const filterType = l.filter?.type ?? 'bandpass';
  const filterQ = l.filter?.q ?? 0.7071067811865475;
  const minHz = l.filter?.minHz;
  const maxHz = l.filter?.maxHz;

  const lfsrGen = l.lfsr ? new LfsrNoise(l.lfsr.bits, layerRng.next() * 10000) : null;
  const bitcrushSpec = l.bitcrush;
  let sampleCount = 0;
  let lastBitcrushVal = 0;

  for (let i = sampleStart; i < sampleEnd; i++) {
    const tRel = (i - sampleStart) / sampleRate;
    let n = lfsrGen ? lfsrGen.next() : layerRng.centered(1);
    let sampleVal = n;

    if (isWhoosh) {
      const startF = (l.pitch?.startHz ?? minHz ?? 400) * pitchJitter;
      const endF = (l.pitch?.endHz ?? maxHz ?? minHz ?? 4000) * pitchJitter;
      const p = dur > 0 ? Math.min(1, Math.max(0, tRel / dur)) : 1;
      const fFilter = startF + (endF - startF) * p;

      if (filterType === 'highpass') {
        hpFilter.update('highpass', fFilter, sampleRate, filterQ);
        sampleVal = hpFilter.process(sampleVal);
      } else if (filterType === 'lowpass') {
        lpFilter.update('lowpass', fFilter, sampleRate, filterQ);
        sampleVal = lpFilter.process(sampleVal);
      } else {
        const lowCut = Math.max(10, fFilter * 0.5);
        const highCut = Math.min(sampleRate / 2 - 20, fFilter * 1.5);
        hpFilter.update('highpass', lowCut, sampleRate, filterQ);
        sampleVal = hpFilter.process(sampleVal);
        lpFilter.update('lowpass', highCut, sampleRate, filterQ);
        sampleVal = lpFilter.process(sampleVal);
      }
    } else {
      const minCutoff = minHz !== undefined && minHz > 0 ? minHz : undefined;
      const maxCutoff = maxHz !== undefined && maxHz > 0 ? maxHz : undefined;
      const targetCutoff = maxCutoff ?? minCutoff;

      if (filterType === 'highpass' && minCutoff !== undefined) {
        hpFilter.update('highpass', minCutoff * pitchJitter, sampleRate, filterQ);
        sampleVal = hpFilter.process(sampleVal);
      } else if (filterType === 'lowpass' && targetCutoff !== undefined) {
        lpFilter.update('lowpass', targetCutoff * pitchJitter, sampleRate, filterQ);
        sampleVal = lpFilter.process(sampleVal);
      } else {
        if (minCutoff !== undefined) {
          hpFilter.update('highpass', minCutoff * pitchJitter, sampleRate, filterQ);
          sampleVal = hpFilter.process(sampleVal);
        }
        if (maxCutoff !== undefined && (minCutoff === undefined || maxCutoff > minCutoff)) {
          lpFilter.update('lowpass', maxCutoff * pitchJitter, sampleRate, filterQ);
          sampleVal = lpFilter.process(sampleVal);
        }
      }
    }

    const env = computeEnvelope(
      tRel,
      attack,
      decay,
      sustain,
      release,
      dur,
      l.envelope?.curve ?? 'linear',
      l.envelope?.points
    );

    let val = sampleVal * env * gainLinear;

    if (bitcrushSpec) {
      const bits = bitcrushSpec.bits ?? 8;
      const downsample = bitcrushSpec.downsample ?? 1;
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
