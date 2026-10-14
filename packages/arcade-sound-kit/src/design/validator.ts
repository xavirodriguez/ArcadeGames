import { SoundRecipe, Category, LayerSpec, SequenceNote } from '../core/types';

export interface ValidationError {
  path: string;
  message: string;
}

export class SoundRecipeValidationError extends Error {
  public errors: ValidationError[];
  constructor(message: string, errors: ValidationError[]) {
    super(message);
    this.name = 'SoundRecipeValidationError';
    this.errors = errors;
  }
}

const VALID_CATEGORIES: Category[] = ['combat', 'movement', 'progression', 'ui'];

export function validateRecipe(recipe: SoundRecipe): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!recipe || typeof recipe !== 'object') {
    return [{ path: '', message: 'Recipe must be a valid object' }];
  }

  if (typeof recipe.name !== 'string' || recipe.name.trim().length === 0) {
    errors.push({ path: 'name', message: 'Recipe name must be a non-empty string' });
  }

  if (!VALID_CATEGORIES.includes(recipe.category)) {
    errors.push({
      path: 'category',
      message: `Category must be one of: ${VALID_CATEGORIES.join(', ')}`,
    });
  }

  if (
    typeof recipe.duration !== 'number' ||
    !Number.isFinite(recipe.duration) ||
    recipe.duration <= 0
  ) {
    errors.push({
      path: 'duration',
      message: 'Recipe duration must be a positive finite number',
    });
  }

  if (!Array.isArray(recipe.layers) || recipe.layers.length === 0) {
    errors.push({ path: 'layers', message: 'Recipe layers must be a non-empty array' });
  } else {
    recipe.layers.forEach((layer, lIdx) => {
      validateLayer(layer, `layers[${lIdx}]`, errors);
    });
  }

  return errors;
}

function validateLayer(
  layer: LayerSpec,
  pathPrefix: string,
  errors: ValidationError[]
) {
  if (!layer || typeof layer !== 'object') {
    errors.push({ path: pathPrefix, message: 'Layer must be an object' });
    return;
  }

  if (layer.kind === 'sequence') {
    if (!Array.isArray(layer.notes) || layer.notes.length === 0) {
      errors.push({
        path: `${pathPrefix}.notes`,
        message: 'Sequence layer must contain a non-empty array of notes',
      });
    } else {
      layer.notes.forEach((note, nIdx) => {
        validateSequenceNote(note, `${pathPrefix}.notes[${nIdx}]`, errors);
      });
    }
  }
}

function validateSequenceNote(
  note: SequenceNote,
  pathPrefix: string,
  errors: ValidationError[]
) {
  if (!note || typeof note !== 'object') {
    errors.push({ path: pathPrefix, message: 'SequenceNote must be an object' });
    return;
  }

  if (
    typeof note.frequency !== 'number' ||
    !Number.isFinite(note.frequency) ||
    note.frequency <= 0
  ) {
    errors.push({
      path: `${pathPrefix}.frequency`,
      message: 'Note frequency must be a positive finite number (> 0)',
    });
  }

  if (
    typeof note.stepDuration !== 'number' ||
    !Number.isFinite(note.stepDuration) ||
    note.stepDuration <= 0
  ) {
    errors.push({
      path: `${pathPrefix}.stepDuration`,
      message: 'Note stepDuration must be a positive finite number (> 0)',
    });
  }

  if (note.level !== undefined && (!Number.isFinite(note.level) || Number.isNaN(note.level))) {
    errors.push({
      path: `${pathPrefix}.level`,
      message: 'Note level must be a finite number',
    });
  }
}

export function assertValidRecipe(recipe: SoundRecipe): void {
  const errors = validateRecipe(recipe);
  if (errors.length > 0) {
    const detail = errors.map((e) => `[${e.path}]: ${e.message}`).join('; ');
    throw new SoundRecipeValidationError(`Invalid recipe "${recipe?.name}": ${detail}`, errors);
  }
}
