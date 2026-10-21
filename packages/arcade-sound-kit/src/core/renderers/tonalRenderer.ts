import { LayerSpec } from '../types';
import { LayerRendererContext } from './types';
import { renderVoice } from '../dsp/voice';
import { computeEnvelope } from '../dsp/envelope';

function dbToLinear(db: number): number {
  return Math.pow(10, db / 20);
}

export function renderTonalLayer(
  samples: Float32Array,
  l: LayerSpec,
  ctx: LayerRendererContext
): void {
  const { sampleRate, pitchJitter, durJitter, levelJitter, duration } = ctx;
  const wave = l.wave ?? (l.kind === 'zap' ? 'square' : 'sine');
  const defaultLevel = -10;
  const levelVal = (l.level ?? defaultLevel) + levelJitter;

  const at = l.start ?? 0;
  const dur = Math.max(0.01, (l.duration ?? 0.1) * durJitter);
  const gainLinear = dbToLinear(levelVal);

  const attack = l.envelope?.attack ?? (l.kind === 'click' ? 0.001 : 0.005);
  const decay = l.envelope?.decay ?? 0.08;
  const sustain = l.envelope?.sustain ?? 0;
  const release = l.envelope?.release ?? 0.01;

  const sampleStart = Math.floor(at * sampleRate);
  const sampleEnd = Math.min(
    samples.length,
    Math.floor((at + dur + release) * sampleRate)
  );

  const p = l.pitch;
  const startHz = (p?.startHz ?? l.frequency ?? 440) * pitchJitter;
  const endHz = p?.endHz != null ? p.endHz * pitchJitter : undefined;
  const curve = p?.curve ?? 'exponential';

  const fmSpec = l.fm ?? (l.harmonicity != null ? { ratio: l.harmonicity, index: 1.0 } : undefined);

  const getFrequency = (tRel: number): number => {
    let f = startHz;
    if (p?.envelope && endHz != null) {
      const penv = computeEnvelope(
        tRel,
        p.envelope.attack ?? 0.005,
        p.envelope.decay ?? dur,
        p.envelope.sustain ?? 0,
        p.envelope.release ?? 0.01,
        dur,
        p.envelope.curve ?? 'linear',
        p.envelope.points
      );
      f = startHz + (endHz - startHz) * penv;
    } else if (endHz != null && endHz !== startHz) {
      const progress = dur > 0 ? Math.min(1, Math.max(0, tRel / dur)) : 1;
      if (curve === 'linear') {
        f = startHz + (endHz - startHz) * progress;
      } else {
        const safeEnd = Math.max(10, endHz);
        const safeStart = Math.max(10, startHz);
        f = safeStart * Math.pow(safeEnd / safeStart, progress);
      }
    }
    return f;
  };

  renderVoice(
    samples,
    {
      wave,
      getFrequency,
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
      durJitter,
      envelope: l.envelope,
      filter: l.filter,
      modulation: l.modulation,
      fm: fmSpec,
      unison: l.unison,
      layerRng: ctx.layerRng,
    }
  );
}
