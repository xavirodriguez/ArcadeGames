import test from 'node:test';
import assert from 'node:assert/strict';
import {
  noteToHz,
  midiToHz,
  durToSeconds,
  scale,
  chordNotes,
  seq,
  rest,
} from '../dist/music/index.js';

test('standard musical frequency and duration conversions', () => {
  // A4 = 440 Hz
  assert.equal(noteToHz('A4'), 440);
  assert.equal(midiToHz(69), 440);

  // C4 = 261.6255... Hz
  const c4Hz = noteToHz('C4');
  assert.ok(Math.abs(c4Hz - 261.6255) < 0.01, `C4 frequency (${c4Hz}) must be ~261.63 Hz`);
  assert.equal(midiToHz(60), c4Hz);

  // '4n' at 120 bpm = 0.5 s
  assert.equal(durToSeconds('4n', 120), 0.5);

  // Dotted note '4n.' = 0.5 * 1.5 = 0.75 s
  assert.equal(durToSeconds('4n.', 120), 0.75);

  // Triplet note '8t' = 0.25 * (2/3) = 0.1666... s
  const triplet8 = durToSeconds('8t', 120);
  assert.ok(Math.abs(triplet8 - (1 / 6)) < 1e-5, `8t duration (${triplet8}) must be ~0.1667s`);
});

test('scale and chord generators return correct pitches', () => {
  const cMajorScale = scale('C4', 'major');
  assert.equal(cMajorScale.length, 7);
  assert.ok(Math.abs(cMajorScale[0] - 261.6255) < 0.01); // C4
  assert.equal(cMajorScale[5], noteToHz('A4')); // A4

  const cMajorChord = chordNotes('C4', 'major');
  assert.equal(cMajorChord.length, 3);
  assert.ok(Math.abs(cMajorChord[0] - 261.6255) < 0.01); // C4
  assert.ok(Math.abs(cMajorChord[1] - noteToHz('E4')) < 0.01); // E4
  assert.ok(Math.abs(cMajorChord[2] - noteToHz('G4')) < 0.01); // G4
});

test('seq and rest helpers construct SequenceNote arrays', () => {
  const r = rest('4n', 120);
  assert.equal(r.frequency, 0);
  assert.equal(r.rest, true);
  assert.equal(r.stepDuration, 0.5);

  const sequence = seq(['C4', 'E4', { note: 'G4', dur: '8n' }, { rest: true, dur: '4n' }], { bpm: 120 });
  assert.equal(sequence.length, 4);
  assert.ok(Math.abs(sequence[0].frequency - 261.6255) < 0.01);
  assert.equal(sequence[2].stepDuration, 0.25);
  assert.equal(sequence[3].rest, true);
});
