import { defineSound } from './recipe';
import { tone, noiseBurst, subBoom, click, zap } from '../effects/primitives';
import { SoundRecipe } from '../core/types';

/**
 * Examples pack containing advanced DSP showcase recipes (LFO, modulation, filters, FM, unison, exponential envelopes).
 * Separate from arcadePack() so base arcade pack audio remains unaffected.
 */
export function examplesPack(): SoundRecipe[] {
  return [
    defineSound('siren', {
      category: 'ui',
      duration: 0.8,
      layers: [
        {
          kind: 'tone',
          wave: 'sawtooth',
          frequency: 600,
          level: -8,
          modulation: {
            pitch: {
              wave: 'triangle',
              rateHz: 4,
              depth: 4, // +/- 4 semitones pitch modulation
            },
          },
        },
      ],
      tags: ['siren', 'lfo', 'example'],
    }),

    defineSound('powerup_vibrato', {
      category: 'progression',
      duration: 0.5,
      layers: [
        tone({ wave: 'triangle', startHz: 440, endHz: 880, level: -8, duration: 0.5 }),
        {
          kind: 'tone',
          wave: 'sine',
          frequency: 880,
          level: -10,
          duration: 0.5,
          modulation: {
            pitch: {
              wave: 'sine',
              rateHz: 8,
              depth: 1.5, // 8 Hz vibrato with 1.5 semitone depth
              delay: 0.1, // delay vibrato onset by 100ms
              fadeIn: 0.2, // 200ms fade in
            },
          },
        },
      ],
      tags: ['powerup', 'vibrato', 'example'],
    }),

    defineSound('filter_modulated', {
      category: 'movement',
      duration: 0.6,
      layers: [
        {
          kind: 'noise',
          level: -10,
          duration: 0.6,
          filter: { type: 'bandpass', minHz: 1200, q: 4 },
          modulation: {
            filter: {
              wave: 'sine',
              rateHz: 3,
              depth: 1.2, // 1.2 octaves filter cutoff sweep
            },
          },
        },
      ],
      tags: ['filter', 'lfo', 'example'],
    }),

    // Exponential envelope variants
    defineSound('shoot_exp', {
      category: 'combat',
      duration: 0.14,
      layers: [
        tone({ wave: 'triangle', startHz: 1700, endHz: 520, level: -7, decay: 0.1 }),
        {
          ...noiseBurst({ level: -19, filter: [1800, 8000], decay: 0.03 }),
          envelope: { attack: 0.001, decay: 0.03, release: 0.01, curve: 'exp' },
        },
      ],
      tags: ['player', 'weapon', 'exp'],
    }),

    defineSound('explosion_small_exp', {
      category: 'combat',
      duration: 0.32,
      layers: [
        {
          ...subBoom({ level: -8, startHz: 130, endHz: 48, duration: 0.25 }),
          envelope: { attack: 0.005, decay: 0.25, release: 0.01, curve: 'exp' },
        },
        {
          ...noiseBurst({ level: -7, filter: [120, 5000], decay: 0.24 }),
          envelope: { attack: 0.001, decay: 0.24, release: 0.01, curve: 'exp' },
        },
        click({ level: -13, frequency: 1600 }),
      ],
      tags: ['explosion', 'exp'],
    }),

    defineSound('jump_exp', {
      category: 'movement',
      duration: 0.16,
      layers: [
        {
          ...zap({ level: -10, startHz: 350, endHz: 1000, duration: 0.13 }),
          envelope: { attack: 0.005, decay: 0.13, release: 0.01, curve: 'exp' },
        },
      ],
      tags: ['player', 'exp'],
    }),

    // FM and Unison showcase recipes
    defineSound('coin_fm', {
      category: 'progression',
      duration: 0.35,
      layers: [
        {
          kind: 'tone',
          wave: 'sine',
          frequency: 987.77, // B5
          level: -8,
          duration: 0.35,
          fm: { ratio: 2.0, index: 3.0, indexEnvelope: { attack: 0.001, decay: 0.2, sustain: 0 } },
        },
      ],
      tags: ['coin', 'fm', 'example'],
    }),

    defineSound('bell_fm', {
      category: 'ui',
      duration: 0.8,
      layers: [
        {
          kind: 'tone',
          wave: 'sine',
          frequency: 523.25, // C5
          level: -6,
          duration: 0.8,
          fm: { ratio: 1.414, index: 4.5, indexEnvelope: { attack: 0.001, decay: 0.6, sustain: 0, curve: 'exp' } },
        },
      ],
      tags: ['bell', 'fm', 'example'],
    }),

    defineSound('metallic_hit_fm', {
      category: 'combat',
      duration: 0.25,
      layers: [
        {
          kind: 'tone',
          wave: 'sine',
          frequency: 320,
          level: -6,
          duration: 0.25,
          fm: { ratio: 3.5, index: 6.0, feedback: 0.8, indexEnvelope: { attack: 0.001, decay: 0.15 } },
        },
        click({ level: -10, frequency: 4000 }),
      ],
      tags: ['impact', 'metallic', 'fm', 'example'],
    }),

    defineSound('short_pad_unison', {
      category: 'progression',
      duration: 0.7,
      layers: [
        {
          kind: 'chord',
          frequencies: [261.63, 329.63, 392.0], // C major
          wave: 'sawtooth',
          level: -10,
          duration: 0.7,
          unison: { voices: 5, detuneCents: 15 },
          envelope: { attack: 0.1, decay: 0.5, sustain: 0.4, release: 0.1 },
        },
      ],
      tags: ['pad', 'unison', 'example'],
    }),
  ];
}
