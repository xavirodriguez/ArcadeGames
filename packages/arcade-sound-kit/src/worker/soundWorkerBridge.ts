import { renderFinal, NormalizationResult } from '../core/render';
import { validateRecipe } from '../design/validator';
import { SoundRecipe, GenerateOptions } from '../core/types';

export interface WorkerRenderRequest {
  id: string;
  action: 'render' | 'cancel';
  recipeJson: string;
  options?: GenerateOptions;
}

export interface WorkerRenderResponse {
  id: string;
  action: 'render_success' | 'render_error';
  samples?: Float32Array;
  sampleRate?: number;
  norm?: NormalizationResult;
  error?: string;
}

let activeRenderId: string | null = null;

export async function processWorkerMessage(
  message: WorkerRenderRequest
): Promise<WorkerRenderResponse> {
  if (message.action === 'cancel') {
    if (activeRenderId === message.id) {
      activeRenderId = null;
    }
    return { id: message.id, action: 'render_error', error: 'Render cancelled' };
  }

  activeRenderId = message.id;

  try {
    let recipe: SoundRecipe;
    try {
      recipe = JSON.parse(message.recipeJson);
    } catch {
      return { id: message.id, action: 'render_error', error: 'Invalid JSON recipe payload' };
    }

    // Rule 6 Security limits for external JSON recipes
    if (!recipe || typeof recipe !== 'object') {
      return { id: message.id, action: 'render_error', error: 'Recipe must be a valid JSON object' };
    }

    if (recipe.duration > 10.0) {
      return { id: message.id, action: 'render_error', error: 'Recipe duration exceeds maximum 10.0s limit' };
    }

    if (Array.isArray(recipe.layers) && recipe.layers.length > 10) {
      return { id: message.id, action: 'render_error', error: 'Recipe layer count exceeds maximum 10 layers limit' };
    }

    if (Array.isArray(recipe.effects) && recipe.effects.length > 4) {
      return { id: message.id, action: 'render_error', error: 'Recipe effect count exceeds maximum 4 effects limit' };
    }

    const issues = validateRecipe(recipe, message.options?.sampleRate ?? 22050);
    if (issues.length > 0) {
      return {
        id: message.id,
        action: 'render_error',
        error: `Recipe validation failed: ${issues.map((i) => i.message).join('; ')}`,
      };
    }

    const result = await renderFinal(recipe, message.options, 0);

    if (activeRenderId !== message.id) {
      return { id: message.id, action: 'render_error', error: 'Render cancelled' };
    }

    return {
      id: message.id,
      action: 'render_success',
      samples: result.samples,
      sampleRate: result.sampleRate,
      norm: result.norm,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { id: message.id, action: 'render_error', error: msg };
  }
}
