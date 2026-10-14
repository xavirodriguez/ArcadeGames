import { SoundRecipe, Category, LayerSpec, SequenceNote } from '../core/types';
import { DEFAULT_SAMPLE_RATE } from '../core/render';

export interface RecipeValidationIssue {
  recipe: string;
  layerIndex?: number;
  field: string;
  path: string;
  value: unknown;
  message: string;
}

// Backward compatibility alias for ValidationError
export type ValidationError = RecipeValidationIssue;

export class SoundRecipeValidationError extends Error {
  public issues: RecipeValidationIssue[];
  public errors: RecipeValidationIssue[];
  constructor(message: string, issues: RecipeValidationIssue[]) {
    const detail = issues
      ? issues.map((i) => `[${i.field}]: ${i.message}`).join('; ')
      : message;
    super(`Recipe validation failed: ${detail}`);
    this.name = 'RecipeValidationError';
    this.issues = issues;
    this.errors = issues;
  }
}

export class RecipeValidationError extends SoundRecipeValidationError {}

const VALID_CATEGORIES: Category[] = ['combat', 'movement', 'progression', 'ui'];

export function validateRecipe(
  recipe: SoundRecipe,
  sampleRate = DEFAULT_SAMPLE_RATE
): RecipeValidationIssue[] {
  const issues: RecipeValidationIssue[] = [];
  const recipeName = recipe?.name ?? 'unknown';

  if (!recipe || typeof recipe !== 'object') {
    return [
      {
        recipe: recipeName,
        field: 'recipe',
        path: 'recipe',
        value: recipe,
        message: 'Recipe must be a valid object',
      },
    ];
  }

  if (typeof recipe.name !== 'string' || recipe.name.trim().length === 0) {
    issues.push({
      recipe: recipeName,
      field: 'name',
      path: 'name',
      value: recipe.name,
      message: 'Recipe name must be a non-empty string',
    });
  }

  if (!VALID_CATEGORIES.includes(recipe.category)) {
    issues.push({
      recipe: recipeName,
      field: 'category',
      path: 'category',
      value: recipe.category,
      message: `Category must be one of: ${VALID_CATEGORIES.join(', ')}`,
    });
  }

  if (
    typeof recipe.duration !== 'number' ||
    !Number.isFinite(recipe.duration) ||
    Number.isNaN(recipe.duration) ||
    recipe.duration <= 0
  ) {
    issues.push({
      recipe: recipeName,
      field: 'duration',
      path: 'duration',
      value: recipe.duration,
      message: 'Recipe duration must be a positive finite number (> 0)',
    });
  }

  if (recipe.variation) {
    for (const key of ['pitch', 'levelDb', 'duration'] as const) {
      const val = recipe.variation[key];
      if (val !== undefined) {
        if (typeof val !== 'number' || !Number.isFinite(val) || Number.isNaN(val)) {
          issues.push({
            recipe: recipeName,
            field: `variation.${key}`,
            path: `variation.${key}`,
            value: val,
            message: `Variation field "${key}" must be a finite number`,
          });
        }
      }
    }
  }

  if (!Array.isArray(recipe.layers) || recipe.layers.length === 0) {
    issues.push({
      recipe: recipeName,
      field: 'layers',
      path: 'layers',
      value: recipe.layers,
      message: 'Recipe layers must be a non-empty array',
    });
  } else {
    recipe.layers.forEach((layer, lIdx) => {
      validateLayer(layer, lIdx, recipeName, recipe.duration, sampleRate, issues);
    });
  }

  return issues;
}

function validateLayer(
  layer: LayerSpec,
  lIdx: number,
  recipeName: string,
  recipeDur: number,
  sampleRate: number,
  issues: RecipeValidationIssue[]
) {
  if (!layer || typeof layer !== 'object') {
    issues.push({
      recipe: recipeName,
      layerIndex: lIdx,
      field: `layers[${lIdx}]`,
      path: `layers[${lIdx}]`,
      value: layer,
      message: 'Layer must be an object',
    });
    return;
  }

  const layerDur = layer.duration ?? recipeDur;

  if (layer.duration !== undefined) {
    if (
      typeof layer.duration !== 'number' ||
      !Number.isFinite(layer.duration) ||
      Number.isNaN(layer.duration) ||
      layer.duration <= 0
    ) {
      issues.push({
        recipe: recipeName,
        layerIndex: lIdx,
        field: `layers[${lIdx}].duration`,
        path: `layers[${lIdx}].duration`,
        value: layer.duration,
        message: 'Layer duration must be a positive finite number (> 0)',
      });
    }
  }

  if (layer.level !== undefined) {
    if (typeof layer.level !== 'number' || !Number.isFinite(layer.level) || Number.isNaN(layer.level)) {
      issues.push({
        recipe: recipeName,
        layerIndex: lIdx,
        field: `layers[${lIdx}].level`,
        path: `layers[${lIdx}].level`,
        value: layer.level,
        message: 'Layer level must be a finite number',
      });
    }
  }

  // 1. Tonal frequency validation (<= 0 is forbidden)
  const isTonal = ['tone', 'zap', 'subBoom', 'click', 'chord', 'sequence'].includes(layer.kind);
  if (isTonal) {
    if (layer.frequency !== undefined) {
      if (
        typeof layer.frequency !== 'number' ||
        !Number.isFinite(layer.frequency) ||
        Number.isNaN(layer.frequency) ||
        layer.frequency <= 0
      ) {
        issues.push({
          recipe: recipeName,
          layerIndex: lIdx,
          field: `layers[${lIdx}].frequency`,
          path: `layers[${lIdx}].frequency`,
          value: layer.frequency,
          message: 'Tonal layer frequency must be a positive finite number (> 0)',
        });
      }
    }

    if (layer.pitch) {
      if (
        typeof layer.pitch.startHz !== 'number' ||
        !Number.isFinite(layer.pitch.startHz) ||
        Number.isNaN(layer.pitch.startHz) ||
        layer.pitch.startHz <= 0
      ) {
        issues.push({
          recipe: recipeName,
          layerIndex: lIdx,
          field: `layers[${lIdx}].pitch.startHz`,
          path: `layers[${lIdx}].pitch.startHz`,
          value: layer.pitch.startHz,
          message: 'Pitch sweep startHz must be a positive finite number (> 0)',
        });
      }
      if (
        typeof layer.pitch.endHz !== 'number' ||
        !Number.isFinite(layer.pitch.endHz) ||
        Number.isNaN(layer.pitch.endHz) ||
        layer.pitch.endHz <= 0
      ) {
        issues.push({
          recipe: recipeName,
          layerIndex: lIdx,
          field: `layers[${lIdx}].pitch.endHz`,
          path: `layers[${lIdx}].pitch.endHz`,
          value: layer.pitch.endHz,
          message: 'Pitch sweep endHz must be a positive finite number (> 0)',
        });
      }
    }

    if (Array.isArray(layer.frequencies)) {
      layer.frequencies.forEach((f, fIdx) => {
        if (typeof f !== 'number' || !Number.isFinite(f) || Number.isNaN(f) || f <= 0) {
          issues.push({
            recipe: recipeName,
            layerIndex: lIdx,
            field: `layers[${lIdx}].frequencies[${fIdx}]`,
            path: `layers[${lIdx}].frequencies[${fIdx}]`,
            value: f,
            message: 'Chord frequency must be a positive finite number (> 0)',
          });
        }
      });
    }

    if (layer.kind === 'sequence') {
      if (!Array.isArray(layer.notes) || layer.notes.length === 0) {
        issues.push({
          recipe: recipeName,
          layerIndex: lIdx,
          field: `layers[${lIdx}].notes`,
          path: `layers[${lIdx}].notes`,
          value: layer.notes,
          message: 'Sequence layer must contain a non-empty array of notes',
        });
      } else {
        layer.notes.forEach((note, nIdx) => {
          validateSequenceNote(note, lIdx, nIdx, recipeName, issues);
        });
      }
    }
  }

  // 2. Envelope validation
  if (layer.envelope) {
    const env = layer.envelope;
    if (env.attack !== undefined) {
      if (typeof env.attack !== 'number' || !Number.isFinite(env.attack) || Number.isNaN(env.attack) || env.attack < 0) {
        issues.push({
          recipe: recipeName,
          layerIndex: lIdx,
          field: `layers[${lIdx}].envelope.attack`,
          path: `layers[${lIdx}].envelope.attack`,
          value: env.attack,
          message: 'Attack must be a non-negative finite number (>= 0)',
        });
      }
    }
    if (env.decay !== undefined) {
      if (typeof env.decay !== 'number' || !Number.isFinite(env.decay) || Number.isNaN(env.decay) || env.decay < 0) {
        issues.push({
          recipe: recipeName,
          layerIndex: lIdx,
          field: `layers[${lIdx}].envelope.decay`,
          path: `layers[${lIdx}].envelope.decay`,
          value: env.decay,
          message: 'Decay must be a non-negative finite number (>= 0)',
        });
      }
    }
    if (env.release !== undefined) {
      if (typeof env.release !== 'number' || !Number.isFinite(env.release) || Number.isNaN(env.release) || env.release < 0) {
        issues.push({
          recipe: recipeName,
          layerIndex: lIdx,
          field: `layers[${lIdx}].envelope.release`,
          path: `layers[${lIdx}].envelope.release`,
          value: env.release,
          message: 'Release must be a non-negative finite number (>= 0)',
        });
      }
    }
    if (env.sustain !== undefined) {
      if (
        typeof env.sustain !== 'number' ||
        !Number.isFinite(env.sustain) ||
        Number.isNaN(env.sustain) ||
        env.sustain < 0 ||
        env.sustain > 1
      ) {
        issues.push({
          recipe: recipeName,
          layerIndex: lIdx,
          field: `layers[${lIdx}].envelope.sustain`,
          path: `layers[${lIdx}].envelope.sustain`,
          value: env.sustain,
          message: 'Sustain level must be in range [0, 1] and finite',
        });
      }
    }

    const attackVal = env.attack ?? 0.005;
    const decayVal = env.decay ?? 0.08;
    if (attackVal + decayVal > layerDur + 0.01) {
      issues.push({
        recipe: recipeName,
        layerIndex: lIdx,
        field: `layers[${lIdx}].envelope`,
        path: `layers[${lIdx}].envelope`,
        value: { attack: attackVal, decay: decayVal, layerDur },
        message: `Active envelope time (attack + decay = ${(attackVal + decayVal).toFixed(3)}s) exceeds layer duration (${layerDur.toFixed(3)}s)`,
      });
    }
  }

  // 3. Noise / filter bounds validation
  if (layer.filter) {
    const nyquist = sampleRate / 2;
    const minHz = layer.filter.minHz;
    const maxHz = layer.filter.maxHz;

    if (minHz !== undefined) {
      if (
        typeof minHz !== 'number' ||
        !Number.isFinite(minHz) ||
        Number.isNaN(minHz) ||
        minHz <= 0 ||
        minHz >= nyquist
      ) {
        issues.push({
          recipe: recipeName,
          layerIndex: lIdx,
          field: `layers[${lIdx}].filter.minHz`,
          path: `layers[${lIdx}].filter.minHz`,
          value: minHz,
          message: `filter.minHz (${minHz}) must be in range (0, Nyquist = ${nyquist}Hz)`,
        });
      }
    }

    if (maxHz !== undefined) {
      if (
        typeof maxHz !== 'number' ||
        !Number.isFinite(maxHz) ||
        Number.isNaN(maxHz) ||
        maxHz <= 0 ||
        maxHz >= nyquist
      ) {
        issues.push({
          recipe: recipeName,
          layerIndex: lIdx,
          field: `layers[${lIdx}].filter.maxHz`,
          path: `layers[${lIdx}].filter.maxHz`,
          value: maxHz,
          message: `filter.maxHz (${maxHz}) must be in range (0, Nyquist = ${nyquist}Hz)`,
        });
      }
    }

    if (minHz !== undefined && maxHz !== undefined && minHz >= maxHz) {
      issues.push({
        recipe: recipeName,
        layerIndex: lIdx,
        field: `layers[${lIdx}].filter`,
        path: `layers[${lIdx}].filter`,
        value: { minHz, maxHz },
        message: `filter.minHz (${minHz}) must be strictly less than filter.maxHz (${maxHz})`,
      });
    }
  }
}

function validateSequenceNote(
  note: SequenceNote,
  lIdx: number,
  nIdx: number,
  recipeName: string,
  issues: RecipeValidationIssue[]
) {
  if (!note || typeof note !== 'object') {
    issues.push({
      recipe: recipeName,
      layerIndex: lIdx,
      field: `layers[${lIdx}].notes[${nIdx}]`,
      path: `layers[${lIdx}].notes[${nIdx}]`,
      value: note,
      message: 'SequenceNote must be an object',
    });
    return;
  }

  if (
    typeof note.frequency !== 'number' ||
    !Number.isFinite(note.frequency) ||
    Number.isNaN(note.frequency) ||
    note.frequency <= 0
  ) {
    issues.push({
      recipe: recipeName,
      layerIndex: lIdx,
      field: `layers[${lIdx}].notes[${nIdx}].frequency`,
      path: `layers[${lIdx}].notes[${nIdx}].frequency`,
      value: note.frequency,
      message: 'Note frequency must be a positive finite number (> 0)',
    });
  }

  if (
    typeof note.stepDuration !== 'number' ||
    !Number.isFinite(note.stepDuration) ||
    Number.isNaN(note.stepDuration) ||
    note.stepDuration <= 0
  ) {
    issues.push({
      recipe: recipeName,
      layerIndex: lIdx,
      field: `layers[${lIdx}].notes[${nIdx}].stepDuration`,
      path: `layers[${lIdx}].notes[${nIdx}].stepDuration`,
      value: note.stepDuration,
      message: 'Note stepDuration must be a positive finite number (> 0)',
    });
  }

  if (note.level !== undefined && (!Number.isFinite(note.level) || Number.isNaN(note.level))) {
    issues.push({
      recipe: recipeName,
      layerIndex: lIdx,
      field: `layers[${lIdx}].notes[${nIdx}].level`,
      path: `layers[${lIdx}].notes[${nIdx}].level`,
      value: note.level,
      message: 'Note level must be a finite number',
    });
  }
}

export function assertValidRecipe(recipe: SoundRecipe, sampleRate = DEFAULT_SAMPLE_RATE): void {
  const issues = validateRecipe(recipe, sampleRate);
  if (issues.length > 0) {
    throw new RecipeValidationError(`Invalid recipe "${recipe?.name}"`, issues);
  }
}
