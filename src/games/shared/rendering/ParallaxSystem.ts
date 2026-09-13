/**
 * ParallaxSystem.ts
 * Manages 7 distinct depth layers for background elements in TinyAster retro arcade games.
 * Provides deterministic parallax offset calculations across Canvas and Skia.
 * @public
 */

export type ParallaxLayerName =
  | "layer0_void"
  | "layer1_nebula"
  | "layer2_distant_stars"
  | "layer3_near_stars"
  | "layer4_distant_asteroids"
  | "layer5_near_objects"
  | "layer6_gameplay";

export const PARALLAX_FACTORS: Record<ParallaxLayerName, number> = {
  layer0_void: 0.0,
  layer1_nebula: 0.05,
  layer2_distant_stars: 0.15,
  layer3_near_stars: 0.35,
  layer4_distant_asteroids: 0.5,
  layer5_near_objects: 0.75,
  layer6_gameplay: 1.0
};

export interface ParallaxOffset {
  offsetX: number;
  offsetY: number;
}

/**
 * Calculates the parallax offset coordinates for a specific depth layer.
 * @public
 */
export function computeParallaxOffset(
  cameraX: number,
  cameraY: number,
  layerName: ParallaxLayerName,
  multiplier: number = 1.0
): ParallaxOffset {
  const factor = (PARALLAX_FACTORS[layerName] ?? 1.0) * multiplier;
  return {
    offsetX: cameraX * factor,
    offsetY: cameraY * factor
  };
}

/**
 * Wraps a coordinate within the screen bounds considering parallax padding.
 */
export function wrapParallaxCoordinate(
  coord: number,
  maxBound: number,
  padding: number = 50
): number {
  const span = maxBound + padding * 2;
  let wrapped = (coord + padding) % span;
  if (wrapped < 0) wrapped += span;
  return wrapped - padding;
}
