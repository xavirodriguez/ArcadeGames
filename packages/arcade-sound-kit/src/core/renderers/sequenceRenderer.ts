import { LayerSpec } from '../types';
import { LayerRendererContext } from './types';
import { renderVoice } from '../dsp/voice';

function dbToLinear(db: number): number {
  return Math.pow(10, db / 20);
}

export function renderSequenceLayer(
  samples: Float32Array,
  l: LayerSpec,
  ctx: LayerRendererContext
): void {
  if (!l.notes || l.notes.length === 0) return;

  const { sampleRate, pitchJitter, durJitter, levelJitter } = ctx;
  const wave = l.kind === 'noise' ? 'noise' : (l.wave ?? 'triangle');
  const defaultLevel = -10;
  const levelVal = (l.level ?? defaultLevel) + levelJitter;
  const loopCount = Math.max(1, l.loopCount ?? 1);
  const at = l.start ?? 0;
  let currentTime = at;

  for (let rep = 0; rep < loopCount; rep++) {
    for (const note of l.notes) {
      const noteDur = Math.max(0.001, note.stepDuration * durJitter);

      if (note.rest === true || (note.frequency <= 0 && l.kind !== 'noise')) {
        currentTime += noteDur;
        continue;
      }

      const noteGainDb = levelVal + (note.level ?? 0);
      const noteGainLinear = dbToLinear(noteGainDb);

      const noteEnvelope = note.envelope ?? l.envelope;
      const noteAttack = noteEnvelope?.attack ?? 0.002;
      const noteDecay = noteEnvelope?.decay ?? (noteDur * 0.8);
      const noteSustain = noteEnvelope?.sustain ?? 0;
      const noteRelease = noteEnvelope?.release ?? (noteDur * 0.2);

      const noteStartSample = Math.floor(currentTime * sampleRate);
      const noteEndSample = Math.min(
        samples.length,
        Math.floor((currentTime + noteDur + noteRelease) * sampleRate)
      );

      const startHz = l.pitch?.startHz ?? (note.frequency > 0 ? note.frequency : 440);
      const endHz = l.pitch?.endHz ?? (note.frequency > 0 ? note.frequency : 440);
      const pitchCurve = l.pitch?.curve ?? 'exponential';

      const getFrequency = (tRel: number) => {
        if (!l.pitch || startHz === endHz) {
          return (note.frequency > 0 ? note.frequency : 440) * pitchJitter;
        }
        const p = noteDur > 0 ? Math.min(1, Math.max(0, tRel / noteDur)) : 1;
        if (pitchCurve === 'linear') {
          return (startHz + (endHz - startHz) * p) * pitchJitter;
        } else {
          const s = Math.max(10, startHz);
          const e = Math.max(10, endHz);
          return s * Math.pow(e / s, p) * pitchJitter;
        }
      };

      const fmSpec = l.fm ?? (l.harmonicity != null ? { ratio: l.harmonicity, index: 1.0 } : undefined);

      renderVoice(
        samples,
        {
          wave,
          getFrequency,
        },
        {
          sampleStart: noteStartSample,
          sampleEnd: noteEndSample,
          sampleRate,
          dur: noteDur,
          attack: noteAttack,
          decay: noteDecay,
          sustain: noteSustain,
          release: noteRelease,
          gainLinear: noteGainLinear,
          duty: l.duty,
          bitcrush: l.bitcrush,
          filter: l.filter,
          modulation: l.modulation,
          fm: fmSpec,
          unison: l.unison,
          layerRng: ctx.layerRng,
          envelope: noteEnvelope,
        }
      );

      currentTime += noteDur;
    }
  }
}
