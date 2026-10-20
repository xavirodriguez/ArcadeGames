import { SequenceNote, LayerSpec } from '../core/types';
import { durToSeconds } from './notes';
import { noiseBurst, subBoom, click, zap } from '../effects/primitives';

export function gridPattern(
  patternStr: string,
  options: {
    noteHz?: number;
    stepDur?: string;
    bpm?: number;
    accentLevelDb?: number;
  } = {}
): SequenceNote[] {
  const bpm = options.bpm ?? 120;
  const stepDurStr = options.stepDur ?? '16n';
  const stepSeconds = durToSeconds(stepDurStr, bpm);
  const noteHz = options.noteHz ?? 440;
  const accentDb = options.accentLevelDb ?? 3;

  const clean = patternStr.replace(/\s+/g, '');
  const result: SequenceNote[] = [];

  for (let i = 0; i < clean.length; i++) {
    const char = clean[i].toLowerCase();
    if (char === 'x' || char === 'o') {
      result.push({
        frequency: noteHz,
        stepDuration: stepSeconds,
        level: char === 'x' ? accentDb : 0,
      });
    } else {
      // '.' or '-' represents rest
      result.push({
        frequency: 0,
        rest: true,
        stepDuration: stepSeconds,
      });
    }
  }

  return result;
}

export const kickLayer = (level = -6): LayerSpec => ({
  ...subBoom({ level, startHz: 120, endHz: 40, duration: 0.12 }),
  pitch: {
    startHz: 150,
    endHz: 35,
    curve: 'exponential',
  },
});

export const snareLayer = (level = -10): LayerSpec => ({
  ...noiseBurst({ level, filter: [400, 7000], decay: 0.12 }),
});

export const hihatLayer = (level = -16, closed = true): LayerSpec => ({
  ...noiseBurst({ level, filter: [3000, 10000], decay: closed ? 0.04 : 0.15 }),
});
