import { SequenceNote } from '../core/types';
import { noteToHz, durToSeconds } from './notes';
import { RNG } from '../core/random';

export interface SeqNoteInput {
  note?: string | number;
  dur?: string;
  level?: number;
  rest?: boolean;
}

export interface SeqOptions {
  bpm?: number;
  swing?: number; // 0..1 swing factor for offbeats
  humanize?: number; // 0..1 timing/velocity random jitter
  rng?: RNG;
}

export function rest(dur = '4n', bpm = 120): SequenceNote {
  const stepDuration = durToSeconds(dur, bpm);
  return {
    frequency: 0,
    rest: true,
    stepDuration,
  };
}

export function seq(
  notes: (string | number | SeqNoteInput)[],
  options: SeqOptions = {}
): SequenceNote[] {
  const bpm = options.bpm ?? 120;
  const swing = options.swing ?? 0;
  const humanize = options.humanize ?? 0;
  const rng = options.rng ?? new RNG(12345);

  const result: SequenceNote[] = [];

  for (let i = 0; i < notes.length; i++) {
    const raw = notes[i];
    let freq = 0;
    let durStr = '4n';
    let levelOffset = 0;
    let isRest = false;

    if (typeof raw === 'string') {
      freq = noteToHz(raw);
    } else if (typeof raw === 'number') {
      freq = raw;
    } else if (typeof raw === 'object' && raw !== null) {
      if (raw.rest || raw.note === 0 || raw.note === 'rest') {
        isRest = true;
      } else if (typeof raw.note === 'string') {
        freq = noteToHz(raw.note);
      } else if (typeof raw.note === 'number') {
        freq = raw.note;
      }
      durStr = raw.dur ?? '4n';
      levelOffset = raw.level ?? 0;
    }

    let baseDur = durToSeconds(durStr, bpm);

    if (swing > 0 && i % 2 === 1) {
      baseDur *= 1 + swing * 0.33;
    }

    if (humanize > 0) {
      const timingJitter = 1 + rng.centered(humanize * 0.05);
      baseDur *= timingJitter;
      levelOffset += rng.centered(humanize * 2);
    }

    if (isRest || freq <= 0) {
      result.push({
        frequency: 0,
        rest: true,
        stepDuration: baseDur,
      });
    } else {
      result.push({
        frequency: freq,
        stepDuration: baseDur,
        level: levelOffset !== 0 ? levelOffset : undefined,
      });
    }
  }

  return result;
}
