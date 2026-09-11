import { Category, LayerSpec, SoundRecipe } from '../core/types';

export const defineSound = (
  name: string,
  spec: Omit<SoundRecipe, 'name'>
): SoundRecipe => ({ name, ...spec });

export const layers = (...items: LayerSpec[]) => items;

export const category = (c: Category) => c;
