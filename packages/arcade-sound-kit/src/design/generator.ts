import { RNG } from '../core/random.js';
import type { SoundRecipe, LayerSpec, Wave, Category } from '../core/types.js';
import { validateRecipe } from './validator.js';

export type SoundArchetype =
  | 'laser'
  | 'explosion'
  | 'coin'
  | 'jump'
  | 'hit'
  | 'powerup'
  | 'ui_blip'
  | 'error';

export interface RandomRecipeOptions {
  archetype: SoundArchetype;
  category?: Category;
  durationRange?: [number, number];
  pitchRange?: [number, number];
}

const ARCHETYPE_CATEGORY_MAP: Record<SoundArchetype, Category> = {
  laser: 'combat',
  explosion: 'combat',
  hit: 'combat',
  coin: 'progression',
  powerup: 'progression',
  jump: 'movement',
  ui_blip: 'ui',
  error: 'ui',
};

export function randomRecipe(options: RandomRecipeOptions, seed: number): SoundRecipe {
  const rng = new RNG(seed);
  const arch = options.archetype;
  const category: Category = options.category ?? ARCHETYPE_CATEGORY_MAP[arch];

  // Parameter-isolated RNG forks
  const durRng = rng.fork('duration');
  const pitchRng = rng.fork('pitch');
  const layerRng = rng.fork('layer');
  const filterRng = rng.fork('filter');

  const durMin = options.durationRange?.[0] ?? 0.05;
  const durMax = options.durationRange?.[1] ?? 0.5;
  const duration = durRng.range(durMin, durMax);

  const pitchMin = options.pitchRange?.[0] ?? 100;
  const pitchMax = options.pitchRange?.[1] ?? 1000;
  const baseFreq = pitchRng.range(pitchMin, pitchMax);

  const layers: LayerSpec[] = [];

  switch (arch) {
    case 'laser': {
      const startHz = pitchRng.range(baseFreq * 1.5, baseFreq * 3);
      const endHz = pitchRng.range(baseFreq * 0.2, baseFreq * 0.5);
      const wave: Wave = layerRng.choice(['sawtooth', 'square', 'sine', 'triangle']);
      layers.push({
        kind: 'tone',
        wave,
        duration,
        pitch: { startHz, endHz },
        envelope: { attack: 0.002, decay: duration * 0.7, sustain: 0.01, release: duration * 0.2 },
      });
      break;
    }
    case 'explosion': {
      const expDur = durRng.range(0.2, 0.8);
      layers.push({
        kind: 'noise',
        duration: expDur,
        envelope: { attack: 0.005, decay: expDur * 0.6, sustain: 0.05, release: expDur * 0.25 },
        filter: {
          type: 'lowpass',
          minHz: filterRng.range(50, 150),
          maxHz: filterRng.range(200, 800),
        },
      });
      layers.push({
        kind: 'tone',
        wave: 'sine',
        duration: expDur * 0.5,
        pitch: { startHz: pitchRng.range(120, 240), endHz: pitchRng.range(30, 60) },
        envelope: { attack: 0.002, decay: expDur * 0.4, sustain: 0, release: expDur * 0.1 },
      });
      break;
    }
    case 'coin': {
      const freq1 = pitchRng.range(800, 1200);
      const freq2 = freq1 * layerRng.choice([1.25, 1.33, 1.5]);
      const coinDur = durRng.range(0.15, 0.35);
      layers.push({
        kind: 'sequence',
        duration: coinDur,
        notes: [
          { frequency: freq1, stepDuration: coinDur * 0.4 },
          { frequency: freq2, stepDuration: coinDur * 0.6 },
        ],
        wave: 'square',
        envelope: { attack: 0.002, decay: coinDur * 0.4, sustain: 0.1, release: coinDur * 0.1 },
      });
      break;
    }
    case 'jump': {
      const jumpDur = durRng.range(0.1, 0.3);
      const startHz = pitchRng.range(150, 300);
      const endHz = startHz * pitchRng.range(2, 4);
      layers.push({
        kind: 'tone',
        wave: 'square',
        duration: jumpDur,
        pitch: { startHz, endHz },
        envelope: { attack: 0.005, decay: jumpDur * 0.5, sustain: 0.1, release: jumpDur * 0.3 },
      });
      break;
    }
    case 'hit': {
      const hitDur = durRng.range(0.05, 0.2);
      layers.push({
        kind: 'noise',
        duration: hitDur,
        envelope: { attack: 0.001, decay: hitDur * 0.7, sustain: 0, release: hitDur * 0.2 },
      });
      layers.push({
        kind: 'tone',
        wave: 'triangle',
        duration: hitDur,
        pitch: { startHz: pitchRng.range(200, 500), endHz: pitchRng.range(50, 100) },
        envelope: { attack: 0.001, decay: hitDur * 0.6, sustain: 0, release: hitDur * 0.2 },
      });
      break;
    }
    case 'powerup': {
      const powDur = durRng.range(0.3, 0.7);
      const baseHz = pitchRng.range(220, 440);
      layers.push({
        kind: 'tone',
        wave: 'sawtooth',
        duration: powDur,
        pitch: { startHz: baseHz, endHz: baseHz * 3 },
        envelope: { attack: 0.01, decay: powDur * 0.5, sustain: 0.2, release: powDur * 0.3 },
        modulation: {
          pitch: { wave: 'sine', rateHz: filterRng.range(8, 16), depth: filterRng.range(1, 3) },
        },
      });
      break;
    }
    case 'ui_blip': {
      const blipDur = durRng.range(0.02, 0.08);
      const blipHz = pitchRng.range(600, 1800);
      layers.push({
        kind: 'tone',
        wave: 'sine',
        duration: blipDur,
        frequency: blipHz,
        envelope: { attack: 0.001, decay: blipDur * 0.7, sustain: 0, release: blipDur * 0.2 },
      });
      break;
    }
    case 'error': {
      const errDur = durRng.range(0.15, 0.35);
      const errHz = pitchRng.range(80, 160);
      layers.push({
        kind: 'tone',
        wave: 'sawtooth',
        duration: errDur,
        frequency: errHz,
        envelope: { attack: 0.005, decay: errDur * 0.6, sustain: 0.2, release: errDur * 0.25 },
        modulation: {
          pitch: { wave: 'square', rateHz: filterRng.range(20, 40), depth: filterRng.range(2, 5) },
        },
      });
      break;
    }
  }

  const recipe: SoundRecipe = {
    name: `${arch}_${seed}`,
    category,
    duration,
    layers,
  };

  const issues = validateRecipe(recipe);
  if (issues.length > 0) {
    throw new Error(`Generated recipe validation failed: ${issues.map((i) => i.message).join('; ')}`);
  }

  return recipe;
}

export function mutate(recipe: SoundRecipe, amount: number, seed: number): SoundRecipe {
  const rng = new RNG(seed);
  const factor = (val: number) => Math.max(0.0001, val * (1 + (rng.next() * 2 - 1) * amount));

  const mutatedDuration = factor(recipe.duration);

  const mutatedLayers = recipe.layers.map((layer) => {
    const l = JSON.parse(JSON.stringify(layer)) as LayerSpec;
    l.duration = l.duration !== undefined ? factor(l.duration) : mutatedDuration;
    const lDur = l.duration;

    if (l.kind === 'tone') {
      if (l.frequency !== undefined) l.frequency = factor(l.frequency);
      if (l.pitch) {
        if (l.pitch.startHz) l.pitch.startHz = factor(l.pitch.startHz);
        if (l.pitch.endHz) l.pitch.endHz = factor(l.pitch.endHz);
      }
    }

    if (l.envelope) {
      if (l.envelope.attack) l.envelope.attack = factor(l.envelope.attack);
      if (l.envelope.decay) l.envelope.decay = factor(l.envelope.decay);
      if (l.envelope.release) l.envelope.release = factor(l.envelope.release);

      const a = l.envelope.attack ?? 0.005;
      const d = l.envelope.decay ?? 0.08;
      const r = l.envelope.release ?? 0.01;
      const totalEnv = a + d + r;

      if (totalEnv > lDur) {
        const scale = (lDur * 0.95) / totalEnv;
        if (l.envelope.attack) l.envelope.attack *= scale;
        if (l.envelope.decay) l.envelope.decay *= scale;
        if (l.envelope.release) l.envelope.release *= scale;
      }
    }

    return l;
  });

  const mutatedRecipe: SoundRecipe = {
    ...recipe,
    name: `${recipe.name}_mut_${seed}`,
    duration: mutatedDuration,
    layers: mutatedLayers,
  };

  return mutatedRecipe;
}

export function morph(recipeA: SoundRecipe, recipeB: SoundRecipe, t: number): SoundRecipe {
  const clampedT = Math.max(0, Math.min(1, t));
  const lerp = (a: number, b: number) => a + (b - a) * clampedT;

  const duration = lerp(recipeA.duration, recipeB.duration);
  const maxLayers = Math.max(recipeA.layers.length, recipeB.layers.length);
  const layers: LayerSpec[] = [];

  for (let i = 0; i < maxLayers; i++) {
    const layerA = recipeA.layers[i % recipeA.layers.length];
    const layerB = recipeB.layers[i % recipeB.layers.length];

    if (layerA.kind === 'tone' && layerB.kind === 'tone') {
      const freqA = layerA.frequency ?? layerA.pitch?.startHz ?? 440;
      const freqB = layerB.frequency ?? layerB.pitch?.startHz ?? 440;
      const blendedFreq = lerp(freqA, freqB);
      const layerDur = lerp(layerA.duration ?? recipeA.duration, layerB.duration ?? recipeB.duration);

      const att = lerp(layerA.envelope?.attack ?? 0.005, layerB.envelope?.attack ?? 0.005);
      const dec = lerp(layerA.envelope?.decay ?? 0.08, layerB.envelope?.decay ?? 0.08);
      const rel = lerp(layerA.envelope?.release ?? 0.01, layerB.envelope?.release ?? 0.01);
      const totalEnv = att + dec + rel;

      let finalAtt = att;
      let finalDec = dec;
      let finalRel = rel;
      if (totalEnv > layerDur) {
        const scale = (layerDur * 0.95) / totalEnv;
        finalAtt *= scale;
        finalDec *= scale;
        finalRel *= scale;
      }

      layers.push({
        kind: 'tone',
        wave: clampedT < 0.5 ? layerA.wave : layerB.wave,
        duration: layerDur,
        frequency: blendedFreq,
        envelope: {
          attack: finalAtt,
          decay: finalDec,
          sustain: lerp(layerA.envelope?.sustain ?? 0.1, layerB.envelope?.sustain ?? 0.1),
          release: finalRel,
        },
      });
    } else {
      layers.push(clampedT < 0.5 ? JSON.parse(JSON.stringify(layerA)) : JSON.parse(JSON.stringify(layerB)));
    }
  }

  return {
    name: `${recipeA.name}_morph_${recipeB.name}`,
    category: recipeA.category,
    duration,
    layers,
  };
}
