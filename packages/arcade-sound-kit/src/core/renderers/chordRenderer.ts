import { LayerSpec } from '../types';
import { LayerRendererContext } from './types';
import { computeEnvelope } from '../dsp/envelope';
import { evalWave } from '../dsp/oscillators';

function dbToLinear(db: number): number {
  return Math.pow(10, db / 20);
}

import { renderVoice } from '../dsp/voice';

export function renderChordLayer(
  samples: Float32Array,
  l: LayerSpec,
  ctx: LayerRendererContext
): void {
  const { sampleRate, pitchJitter, durJitter, levelJitter } = ctx;
  const wave = l.wave ?? 'sine';
  const defaultLevel = -10;
  const levelVal = (l.level ?? defaultLevel) + levelJitter;

  const at = l.start ?? 0;
  const dur = Math.max(0.01, (l.duration ?? 0.1) * durJitter);
  const freqs = (l.frequencies ?? []).map((hz) => hz * pitchJitter);
  if (freqs.length === 0) return;

  const attack = l.envelope?.attack ?? 0.005;
  const decay = l.envelope?.decay ?? 0.08;
  const sustain = l.envelope?.sustain ?? 0;
  const release = l.envelope?.release ?? 0.01;

  const sampleStart = Math.floor(at * sampleRate);
  const sampleEnd = Math.min(
    samples.length,
    Math.floor((at + dur + release) * sampleRate)
  );

  const gainLinear = dbToLinear(levelVal);

  for (const hz of freqs) {
    renderVoice(
      samples,
      {
        wave,
        getFrequency: () => hz,
      },
      {
        sampleStart,
        sampleEnd,
        sampleRate,
        dur,
        attack,
        decay,
        sustain,
        release,
        gainLinear,
        duty: l.duty,
        bitcrush: l.bitcrush,
        filter: l.filter,
        modulation: l.modulation,
        fm: l.fm,
        unison: l.unison,
        layerRng: ctx.layerRng,
        envelope: l.envelope,
      }
    );
  }
}
