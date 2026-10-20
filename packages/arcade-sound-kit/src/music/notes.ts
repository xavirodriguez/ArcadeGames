const NOTE_INDEXES: Record<string, number> = {
  C: 0,
  'C#': 1,
  DB: 1,
  D: 2,
  'D#': 3,
  EB: 3,
  E: 4,
  F: 5,
  'F#': 6,
  GB: 6,
  G: 7,
  'G#': 8,
  AB: 8,
  A: 9,
  'A#': 10,
  BB: 10,
  B: 11,
};

export function midiToHz(midi: number, a4Hz = 440): number {
  if (typeof midi !== 'number' || !Number.isFinite(midi)) {
    throw new Error(`Invalid MIDI note value: ${midi}`);
  }
  return a4Hz * Math.pow(2, (midi - 69) / 12);
}

export function noteToMidi(noteName: string): number {
  if (typeof noteName !== 'string' || noteName.trim().length === 0) {
    throw new Error(`Invalid note name: ${noteName}`);
  }

  const match = noteName.trim().toUpperCase().match(/^([A-G][#B]?)(-?\d+)$/);
  if (!match) {
    throw new Error(`Unrecognized note format: "${noteName}". Expected format like "C4", "C#4", or "Db3"`);
  }

  const pitchStr = match[1];
  const octave = parseInt(match[2], 10);
  const pitchIdx = NOTE_INDEXES[pitchStr];

  if (pitchIdx === undefined) {
    throw new Error(`Invalid note pitch: "${pitchStr}"`);
  }

  return (octave + 1) * 12 + pitchIdx;
}

export function noteToHz(noteName: string, a4Hz = 440): number {
  const midiVal = noteToMidi(noteName);
  return midiToHz(midiVal, a4Hz);
}

export const note = noteToHz;
export const midi = midiToHz;
export const dur = durToSeconds;

export function durToSeconds(notation: string, bpm = 120): number {
  if (typeof bpm !== 'number' || bpm <= 0 || !Number.isFinite(bpm)) {
    throw new Error(`Invalid BPM value: ${bpm}`);
  }

  if (typeof notation !== 'string' || notation.trim().length === 0) {
    throw new Error(`Invalid duration notation: ${notation}`);
  }

  const clean = notation.trim().toLowerCase();
  const isDotted = clean.includes('.');
  const isTriplet = clean.includes('t');

  const baseDigits = clean.replace(/[^0-9]/g, '');
  const quartersMap: Record<string, number> = {
    '1': 4.0,
    '2': 2.0,
    '4': 1.0,
    '8': 0.5,
    '16': 0.25,
    '32': 0.125,
  };

  const quarters = quartersMap[baseDigits];
  if (quarters === undefined) {
    throw new Error(`Unrecognized duration notation: "${notation}". Expected values like "4n", "8n.", "16t"`);
  }

  const quarterDurationSec = 60 / bpm;
  let durationSec = quarters * quarterDurationSec;

  if (isDotted) {
    durationSec *= 1.5;
  }

  if (isTriplet) {
    durationSec *= 2 / 3;
  }

  return durationSec;
}
