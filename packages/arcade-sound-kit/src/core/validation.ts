import { SoundRecipe } from './types';
import { DEFAULT_SAMPLE_RATE } from './render';

export interface ValidationIssue {
  recipe: string;
  layerIndex?: number;
  field: string;
  value: unknown;
  message: string;
}

export class RecipeValidationError extends Error {
  public readonly issues: ValidationIssue[];

  constructor(issues: ValidationIssue[]) {
    const summary = issues
      .map((i) => {
        const target = `${i.recipe}${i.layerIndex != null ? ` layer ${i.layerIndex}` : ''}`;
        return `[${target}] ${i.field}: ${i.message} (received ${JSON.stringify(i.value)})`;
      })
      .join('; ');
    super(`Recipe validation failed with ${issues.length} issue(s): ${summary}`);
    this.name = 'RecipeValidationError';
    this.issues = issues;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export function validateRecipe(
  recipe: SoundRecipe,
  sampleRate = DEFAULT_SAMPLE_RATE
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  function checkNum(val: unknown, name: string, layerIndex?: number) {
    if (typeof val === 'number') {
      if (Number.isNaN(val) || !Number.isFinite(val)) {
        issues.push({
          recipe: recipe.name,
          layerIndex,
          field: name,
          value: val,
          message: 'Must be a finite number',
        });
      }
    }
  }

  checkNum(recipe.duration, 'duration');
  if (
    typeof recipe.duration !== 'number' ||
    recipe.duration <= 0 ||
    !Number.isFinite(recipe.duration)
  ) {
    issues.push({
      recipe: recipe.name,
      field: 'duration',
      value: recipe.duration,
      message: 'Duration must be > 0 and finite',
    });
  }

  if (recipe.bitcrush != null) checkNum(recipe.bitcrush, 'bitcrush');
  if (recipe.variation) {
    checkNum(recipe.variation.pitch, 'variation.pitch');
    checkNum(recipe.variation.levelDb, 'variation.levelDb');
    checkNum(recipe.variation.duration, 'variation.duration');
  }

  if (!Array.isArray(recipe.layers) || recipe.layers.length === 0) {
    issues.push({
      recipe: recipe.name,
      field: 'layers',
      value: recipe.layers,
      message: 'Must have at least one layer',
    });
    return issues;
  }

  for (let i = 0; i < recipe.layers.length; i++) {
    const l = recipe.layers[i];
    const layerDur = l.duration ?? recipe.duration;

    checkNum(l.level, 'level', i);
    checkNum(l.start, 'start', i);
    checkNum(l.duration, 'duration', i);
    checkNum(l.frequency, 'frequency', i);

    if (
      l.duration != null &&
      (typeof l.duration !== 'number' || l.duration <= 0 || !Number.isFinite(l.duration))
    ) {
      issues.push({
        recipe: recipe.name,
        layerIndex: i,
        field: 'duration',
        value: l.duration,
        message: 'Layer duration must be > 0 and finite',
      });
    }

    if (
      l.kind === 'tone' ||
      l.kind === 'zap' ||
      l.kind === 'click' ||
      l.kind === 'subBoom'
    ) {
      if (l.frequency != null && l.frequency <= 0) {
        issues.push({
          recipe: recipe.name,
          layerIndex: i,
          field: 'frequency',
          value: l.frequency,
          message: 'Frequency must be > 0',
        });
      }
      if (l.pitch) {
        checkNum(l.pitch.startHz, 'pitch.startHz', i);
        checkNum(l.pitch.endHz, 'pitch.endHz', i);
        if (l.pitch.startHz <= 0) {
          issues.push({
            recipe: recipe.name,
            layerIndex: i,
            field: 'pitch.startHz',
            value: l.pitch.startHz,
            message: 'startHz must be > 0',
          });
        }
        if (l.pitch.endHz <= 0) {
          issues.push({
            recipe: recipe.name,
            layerIndex: i,
            field: 'pitch.endHz',
            value: l.pitch.endHz,
            message: 'endHz must be > 0',
          });
        }
      }
    } else if (l.kind === 'chord') {
      if (Array.isArray(l.frequencies)) {
        for (let k = 0; k < l.frequencies.length; k++) {
          const hz = l.frequencies[k];
          checkNum(hz, `frequencies[${k}]`, i);
          if (hz <= 0) {
            issues.push({
              recipe: recipe.name,
              layerIndex: i,
              field: `frequencies[${k}]`,
              value: hz,
              message: 'Chord frequency must be > 0',
            });
          }
        }
      }
    }

    if (l.envelope) {
      const attack = l.envelope.attack ?? (l.kind === 'noise' || l.kind === 'click' ? 0.001 : 0.005);
      const decay = l.envelope.decay ?? 0.08;
      const sustain = l.envelope.sustain ?? 0;
      const release = l.envelope.release ?? 0.01;

      checkNum(l.envelope.attack, 'envelope.attack', i);
      checkNum(l.envelope.decay, 'envelope.decay', i);
      checkNum(l.envelope.sustain, 'envelope.sustain', i);
      checkNum(l.envelope.release, 'envelope.release', i);

      if (attack < 0) {
        issues.push({
          recipe: recipe.name,
          layerIndex: i,
          field: 'envelope.attack',
          value: attack,
          message: 'Attack cannot be negative',
        });
      }
      if (decay < 0) {
        issues.push({
          recipe: recipe.name,
          layerIndex: i,
          field: 'envelope.decay',
          value: decay,
          message: 'Decay cannot be negative',
        });
      }
      if (release < 0) {
        issues.push({
          recipe: recipe.name,
          layerIndex: i,
          field: 'envelope.release',
          value: release,
          message: 'Release cannot be negative',
        });
      }
      if (sustain < 0 || sustain > 1) {
        issues.push({
          recipe: recipe.name,
          layerIndex: i,
          field: 'envelope.sustain',
          value: sustain,
          message: 'Sustain must be between 0 and 1',
        });
      }

      if (attack + decay > layerDur + 0.015) {
        issues.push({
          recipe: recipe.name,
          layerIndex: i,
          field: 'envelope',
          value: { attack, decay, layerDur },
          message: `Envelope attack + decay (${attack + decay}s) exceeds layer duration (${layerDur}s)`,
        });
      }
    }

    if (l.filter) {
      checkNum(l.filter.minHz, 'filter.minHz', i);
      checkNum(l.filter.maxHz, 'filter.maxHz', i);
      if (l.filter.minHz != null && l.filter.maxHz != null) {
        if (l.filter.minHz >= l.filter.maxHz) {
          issues.push({
            recipe: recipe.name,
            layerIndex: i,
            field: 'filter',
            value: { minHz: l.filter.minHz, maxHz: l.filter.maxHz },
            message: 'minHz must be < maxHz',
          });
        }
        if (l.filter.maxHz >= sampleRate / 2) {
          issues.push({
            recipe: recipe.name,
            layerIndex: i,
            field: 'filter.maxHz',
            value: l.filter.maxHz,
            message: `maxHz must be < Nyquist (${sampleRate / 2} Hz)`,
          });
        }
      }
    }
  }

  return issues;
}
