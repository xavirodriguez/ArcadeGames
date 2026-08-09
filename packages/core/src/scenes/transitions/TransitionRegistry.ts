import { ITransitionEffect } from "../TransitionTypes";
import { FadeTransition } from "./FadeTransition";
import { IrisTransition } from "./IrisTransition";
import { DitherTransition } from "./DitherTransition";
import { PixelateTransition } from "./PixelateTransition";
import { ScanlineWipeTransition } from "./ScanlineWipeTransition";

/**
 * Registry of all available default transition effects.
 *
 * @remarks
 * Allows fetching transition effects by string name.
 * Each transition is also exported individually for Tree Shaking.
 *
 * @public
 */
export const TransitionRegistry: Record<string, ITransitionEffect> = {
  fade: new FadeTransition(),
  iris: new IrisTransition(),
  dither: new DitherTransition(),
  pixelate: new PixelateTransition(),
  scanline: new ScanlineWipeTransition(),
};

/**
 * Resolves a transition effect by string name or directly returns the effect.
 * @param effect - Transition effect name or class instance.
 * @returns Resolved transition effect, or undefined.
 * @public
 */
export function resolveTransitionEffect(effect?: string | ITransitionEffect): ITransitionEffect | undefined {
  if (!effect) return undefined;
  if (typeof effect === "string") {
    return TransitionRegistry[effect.toLowerCase()];
  }
  return effect;
}
