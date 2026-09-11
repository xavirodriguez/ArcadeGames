import { defineSound } from './recipe';
import {
  tone,
  noiseBurst,
  click,
  zap,
  whoosh,
  subBoom,
  chord,
} from '../effects/primitives';
import { SoundRecipe } from '../core/types';

const d = (
  name: string,
  category: SoundRecipe['category'],
  duration: number,
  layers: SoundRecipe['layers'],
  extra: Partial<SoundRecipe> = {}
): SoundRecipe =>
  defineSound(name, {
    category,
    duration,
    layers,
    variation: { pitch: 0.025, levelDb: 0.7, duration: 0.06 },
    ...extra,
  });

/**
 * Full arcade pack – one-shots + loop-oriented recipes.
 * Designed for Asteroids / Space Invaders / Flappy / Pong style games.
 */
export function arcadePack(): SoundRecipe[] {
  return [
    // ── Combat ──────────────────────────────────────────────
    d(
      'shoot',
      'combat',
      0.14,
      [
        tone({ wave: 'triangle', startHz: 1700, endHz: 520, level: -7, decay: 0.1 }),
        noiseBurst({ level: -19, filter: [1800, 8000], decay: 0.03 }),
      ],
      { tags: ['player', 'weapon'] }
    ),
    d(
      'shoot_enemy',
      'combat',
      0.16,
      [
        tone({ wave: 'square', startHz: 700, endHz: 220, level: -8, decay: 0.12 }),
        noiseBurst({ level: -18, filter: [500, 3500], decay: 0.05 }),
      ],
      { tags: ['enemy', 'weapon'] }
    ),
    d(
      'hit',
      'combat',
      0.11,
      [
        click({ level: -7, frequency: 2600 }),
        noiseBurst({ level: -13, filter: [700, 5000], decay: 0.07 }),
      ],
      { tags: ['impact'] }
    ),
    d(
      'hit_critical',
      'combat',
      0.28,
      [
        click({ level: -5, frequency: 4500 }),
        zap({ level: -8, startHz: 2200, endHz: 500, duration: 0.16 }),
        chord([523, 659, 784], { level: -12, duration: 0.18 }),
        noiseBurst({ level: -16, filter: [2000, 7000], decay: 0.12 }),
      ],
      { tags: ['impact', 'special'] }
    ),
    d(
      'explosion_small',
      'combat',
      0.32,
      [
        subBoom({ level: -8, startHz: 130, endHz: 48, duration: 0.25 }),
        noiseBurst({ level: -7, filter: [120, 5000], decay: 0.24 }),
        click({ level: -13, frequency: 1600 }),
      ],
      { tags: ['explosion'] }
    ),
    d(
      'explosion_large',
      'combat',
      0.72,
      [
        subBoom({ level: -3, startHz: 150, endHz: 38, duration: 0.55 }),
        noiseBurst({ level: -4, filter: [80, 4200], decay: 0.52 }),
        noiseBurst({ level: -13, filter: [2500, 9000], decay: 0.28 }),
      ],
      { tags: ['explosion', 'boss'] }
    ),
    d(
      'shield_hit',
      'combat',
      0.15,
      [
        chord([330, 494, 659], { level: -9, duration: 0.1 }),
        click({ level: -13, frequency: 3500 }),
      ],
      { tags: ['shield'] }
    ),
    d(
      'shield_break',
      'combat',
      0.32,
      [
        zap({ level: -7, startHz: 1400, endHz: 160, duration: 0.24 }),
        noiseBurst({ level: -10, filter: [600, 5500], decay: 0.22 }),
        click({ level: -11, frequency: 2800 }),
        chord([220, 277], { level: -14, duration: 0.18 }),
      ],
      { tags: ['shield', 'break'] }
    ),
    d(
      'reload',
      'combat',
      0.25,
      [
        tone({ wave: 'sine', startHz: 500, endHz: 900, level: -10, decay: 0.09 }),
        tone({ wave: 'sine', startHz: 700, endHz: 1200, level: -12, decay: 0.09, duration: 0.1 }),
      ],
      { tags: ['weapon', 'ready'] }
    ),
    d(
      'cooldown_ready',
      'combat',
      0.18,
      [
        tone({ wave: 'sine', startHz: 600, endHz: 1100, level: -11, decay: 0.08 }),
        click({ level: -14, frequency: 2200 }),
      ],
      { tags: ['weapon', 'ready'] }
    ),
    d(
      'parry',
      'combat',
      0.14,
      [
        click({ level: -5, frequency: 5000 }),
        zap({ level: -10, startHz: 2400, endHz: 900, duration: 0.1 }),
      ],
      { tags: ['deflect'] }
    ),

    // ── Movement ────────────────────────────────────────────
    d(
      'jump',
      'movement',
      0.16,
      [zap({ level: -10, startHz: 350, endHz: 1000, duration: 0.13 })],
      { tags: ['player'] }
    ),
    d(
      'land',
      'movement',
      0.13,
      [
        subBoom({ level: -11, startHz: 110, endHz: 55, duration: 0.1 }),
        click({ level: -16, frequency: 1000 }),
      ],
      { tags: ['player'] }
    ),
    d(
      'land_heavy',
      'movement',
      0.22,
      [
        subBoom({ level: -5, startHz: 100, endHz: 38, duration: 0.18 }),
        noiseBurst({ level: -14, filter: [100, 1200], decay: 0.14 }),
      ],
      { tags: ['player', 'impact'] }
    ),
    d(
      'dash',
      'movement',
      0.18,
      [
        whoosh({ level: -10, startHz: 300, endHz: 6000, duration: 0.15 }),
        zap({ level: -12, startHz: 1800, endHz: 400, duration: 0.12 }),
      ],
      { tags: ['player'] }
    ),
    d(
      'wall_slide',
      'movement',
      0.4,
      [
        noiseBurst({ level: -12, filter: [700, 4800], decay: 0.38 }),
        noiseBurst({ level: -18, filter: [1800, 6500], decay: 0.3 }),
      ],
      { loop: true, tags: ['player', 'friction'] }
    ),
    d(
      'bounce',
      'movement',
      0.13,
      [zap({ level: -11, startHz: 250, endHz: 850, duration: 0.1 })],
      { tags: ['physics', 'pong'] }
    ),
    d(
      'spin_charge',
      'movement',
      0.34,
      [
        whoosh({ level: -14, startHz: 500, endHz: 3500, duration: 0.3 }),
        chord([294, 370], { level: -15, duration: 0.22 }),
      ],
      { tags: ['pong', 'charge'] }
    ),
    d(
      'flap',
      'movement',
      0.1,
      [whoosh({ level: -13, startHz: 220, endHz: 1600, duration: 0.08 })],
      { tags: ['flappy'] }
    ),
    d(
      'glide_loop',
      'movement',
      0.5,
      [
        whoosh({ level: -18, startHz: 280, endHz: 1200, duration: 0.48 }),
        noiseBurst({ level: -22, filter: [200, 900], decay: 0.45 }),
      ],
      { loop: true, tags: ['flappy', 'air'] }
    ),
    d(
      'wrap',
      'movement',
      0.12,
      [zap({ level: -12, startHz: 900, endHz: 1800, duration: 0.09 })],
      { tags: ['asteroids'] }
    ),
    d(
      'thrust_loop',
      'movement',
      0.45,
      [
        noiseBurst({ level: -11, filter: [80, 900], decay: 0.42 }),
        noiseBurst({ level: -16, filter: [1200, 4500], decay: 0.4 }),
        tone({ wave: 'sawtooth', startHz: 55, endHz: 48, level: -18, decay: 0.4 }),
      ],
      { loop: true, tags: ['asteroids', 'engine'], bitcrush: 0.15 }
    ),

    // ── Progression ─────────────────────────────────────────
    d(
      'score',
      'progression',
      0.1,
      [tone({ wave: 'sine', startHz: 900, endHz: 1300, level: -12, decay: 0.07 })],
      { tags: ['reward'] }
    ),
    d(
      'combo_up',
      'progression',
      0.24,
      [
        chord([330, 392], { level: -11, duration: 0.09 }),
        chord([392, 494], { level: -10, duration: 0.1 }),
        tone({ wave: 'sine', startHz: 660, endHz: 880, level: -14, decay: 0.08 }),
      ],
      { tags: ['reward', 'combo'] }
    ),
    d(
      'combo_break',
      'progression',
      0.22,
      [zap({ level: -11, startHz: 520, endHz: 160, duration: 0.18 })],
      { tags: ['combo', 'negative'] }
    ),
    d(
      'powerup_pickup',
      'progression',
      0.34,
      [
        zap({ level: -10, startHz: 500, endHz: 1400, duration: 0.25 }),
        chord([523, 659, 784], { level: -11, duration: 0.2 }),
        click({ level: -16, frequency: 3200 }),
      ],
      { tags: ['reward', 'powerup'] }
    ),
    d(
      'powerup_expire',
      'progression',
      0.28,
      [zap({ level: -12, startHz: 900, endHz: 260, duration: 0.24 })],
      { tags: ['powerup', 'warning'] }
    ),
    d(
      'collectible_pickup',
      'progression',
      0.13,
      [chord([392, 587], { level: -12, duration: 0.08 })],
      { tags: ['reward', 'collect'] }
    ),
    d(
      'achievement_unlock',
      'progression',
      0.48,
      [
        chord([523, 659, 784, 1047], { level: -8, duration: 0.32 }),
        zap({ level: -15, startHz: 900, endHz: 1800, duration: 0.38 }),
        click({ level: -14, frequency: 2800 }),
      ],
      { tags: ['reward', 'special'] }
    ),

    // ── UI / Game state ─────────────────────────────────────
    d(
      'game_over',
      'ui',
      1.0,
      [
        tone({ wave: 'triangle', startHz: 392, endHz: 300, level: -8, decay: 0.2, duration: 0.2 }),
        tone({ wave: 'triangle', startHz: 330, endHz: 240, level: -9, decay: 0.2, duration: 0.2 }),
        subBoom({ level: -12, startHz: 100, endHz: 48, duration: 0.7 }),
      ],
      { tags: ['state'] }
    ),
    d(
      'wave_start',
      'ui',
      0.45,
      [
        chord([261, 330, 392], { level: -10, duration: 0.25 }),
        zap({ level: -14, startHz: 600, endHz: 1400, duration: 0.3 }),
      ],
      { tags: ['state'] }
    ),
    d(
      'boss_incoming',
      'ui',
      0.95,
      [
        subBoom({ level: -5, startHz: 100, endHz: 38, duration: 0.8 }),
        zap({ level: -11, startHz: 280, endHz: 65, duration: 0.7 }),
        noiseBurst({ level: -16, filter: [250, 1600], decay: 0.6 }),
        chord([110, 138], { level: -14, duration: 0.5 }),
      ],
      { tags: ['state', 'boss', 'warning'] }
    ),
    d(
      'menu_select',
      'ui',
      0.09,
      [tone({ wave: 'square', startHz: 700, endHz: 950, level: -14, decay: 0.05 })],
      { tags: ['ui'] }
    ),
    d(
      'menu_confirm',
      'ui',
      0.22,
      [chord([330, 415, 523], { level: -12, duration: 0.15 })],
      { tags: ['ui'] }
    ),
  ];
}
