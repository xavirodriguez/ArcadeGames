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
  const wave = l.wave ?? 'triangle';
  const defaultLevel = -10;
  const levelVal = (l.level ?? defaultLevel) + levelJitter;
  const loopCount = Math.max(1, l.loopCount ?? 1);
  const at = l.start ?? 0;
  let currentTime = at;

  for (let rep = 0; rep < loopCount; rep++) {
    for (const note of l.notes) {
      const noteDur = Math.max(0.001, note.stepDuration * durJitter);

      if (note.rest === true || note.frequency <= 0) {
        currentTime += noteDur;
        continue;
      }

      const noteGainDb = levelVal + (note.level ?? 0);
      const noteGainLinear = dbToLinear(noteGainDb);

      const noteAttack = note.envelope?.attack ?? l.envelope?.attack ?? 0.002;
      const noteDecay = note.envelope?.decay ?? l.envelope?.decay ?? (noteDur * 0.8);
      const noteSustain = note.envelope?.sustain ?? l.envelope?.sustain ?? 0;
      const noteRelease = note.envelope?.release ?? l.envelope?.release ?? (noteDur * 0.2);

      const noteStartSample = Math.floor(currentTime * sampleRate);
      const noteEndSample = Math.min(
        samples.length,
        Math.floor((currentTime + noteDur + noteRelease) * sampleRate)
      );

      const hz = note.frequency * pitchJitter;
      const fmSpec = l.fm ?? (l.harmonicity != null ? { ratio: l.harmonicity, index: 1.0 } : undefined);

      renderVoice(
        samples,
        {
          wave,
          getFrequency: () => hz,
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
        }
      );

      currentTime += noteDur;
    }
  }
}
