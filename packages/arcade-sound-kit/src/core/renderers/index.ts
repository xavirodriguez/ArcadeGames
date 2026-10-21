import { LayerSpec } from '../types';
import { LayerRenderer, LayerRendererContext } from './types';
import { renderNoiseLayer } from './noiseRenderer';
import { renderSequenceLayer } from './sequenceRenderer';
import { renderChordLayer } from './chordRenderer';
import { renderTonalLayer } from './tonalRenderer';

export * from './types';

export const layerRenderers: Record<LayerSpec['kind'], LayerRenderer> = {
  noise: renderNoiseLayer,
  whoosh: renderNoiseLayer,
  sequence: renderSequenceLayer,
  chord: renderChordLayer,
  tone: renderTonalLayer,
  click: renderTonalLayer,
  zap: renderTonalLayer,
  subBoom: renderTonalLayer,
};
