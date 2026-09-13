/**
 * Shared mathematical pulse utility functions for Space Invaders rendering.
 *
 * Provides pure, zero-allocation sine wave calculations for shield, eye, core,
 * and warning indicator pulsation effects across Canvas2D and Skia renderers.
 */

/**
 * Calculates a sine wave pulse value centered at base with amplitude and frequency.
 * Formula: `base + amplitude * Math.sin(tick * frequency)`
 *
 * @param tick - The current simulation tick number.
 * @param frequency - The pulse frequency scalar (e.g. 0.25 for tick / 4).
 * @param amplitude - The pulse amplitude scaling factor.
 * @param base - The baseline center offset value.
 */
export function computeSinePulse(
  tick: number,
  frequency: number = 0.25,
  amplitude: number = 0.08,
  base: number = 1.0
): number {
  return base + amplitude * Math.sin(tick * frequency);
}
