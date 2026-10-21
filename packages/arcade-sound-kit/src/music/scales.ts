import { noteToMidi, midiToHz } from './notes';

const SCALE_INTERVALS: Record<string, number[]> = {
  major: [0, 2, 4, 5, 7, 9, 11],
  minor: [0, 2, 3, 5, 7, 8, 10], // natural minor
  pentatonic: [0, 2, 4, 7, 9], // major pentatonic
  dorian: [0, 2, 3, 5, 7, 9, 10],
  harmonic_minor: [0, 2, 3, 5, 7, 8, 11],
};

const CHORD_INTERVALS: Record<string, number[]> = {
  major: [0, 4, 7],
  minor: [0, 3, 7],
  dim: [0, 3, 6],
  aug: [0, 4, 8],
  maj7: [0, 4, 7, 11],
  min7: [0, 3, 7, 10],
  '7': [0, 4, 7, 10],
};

export function scale(
  root: string,
  mode: 'major' | 'minor' | 'pentatonic' | 'dorian' | 'harmonic_minor' = 'major'
): number[] {
  const rootMidi = noteToMidi(root);
  const intervals = SCALE_INTERVALS[mode];
  if (!intervals) {
    throw new Error(`Unrecognized scale mode: "${mode}". Valid modes: ${Object.keys(SCALE_INTERVALS).join(', ')}`);
  }
  return intervals.map((step) => midiToHz(rootMidi + step));
}

export function chordNotes(
  root: string,
  quality: 'major' | 'minor' | 'dim' | 'aug' | 'maj7' | 'min7' | '7' = 'major'
): number[] {
  const rootMidi = noteToMidi(root);
  const intervals = CHORD_INTERVALS[quality];
  if (!intervals) {
    throw new Error(`Unrecognized chord quality: "${quality}". Valid qualities: ${Object.keys(CHORD_INTERVALS).join(', ')}`);
  }
  return intervals.map((step) => midiToHz(rootMidi + step));
}

export const musicChord = chordNotes;
export const chord = chordNotes;
/** Alias to avoid collision with primitive layer function chord */
export const chordScale = chordNotes;
