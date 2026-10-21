import { LayerSpec, SoundRecipe } from '../types';
import { RNG } from '../random';

export interface LayerRendererContext {
  recipe: SoundRecipe;
  sampleRate: number;
  pitchJitter: number;
  durJitter: number;
  levelJitter: number;
  layerRng: RNG;
  duration: number;
}

export type LayerRenderer = (
  samples: Float32Array,
  layer: LayerSpec,
  ctx: LayerRendererContext
) => void;
