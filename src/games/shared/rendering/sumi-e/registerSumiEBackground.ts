/**
 * registerSumiEBackground.ts
 * One-call registration of the ink-wash parallax backdrop for any game renderer.
 *
 * Phase 1 of the Sumi-e background integration roadmap.
 */

import type { Renderer, RenderContext, CoreComponentRegistry } from "@tiny-aster/core";
import {
  getAestheticTheme,
  type AestheticId,
  type AestheticThemeConfig,
  type SumiELandscapeVariant
} from "./AestheticTheme";
import type { SumiEPaletteVariant } from "./SumiEPalette";
import {
  createInkWashCanvasEffect,
  createInkWashSkiaEffect,
  INK_WASH_EFFECT_NAME,
  type InkWashEffectOptions
} from "./InkWashBackgroundEffect";

export interface RegisterSumiEBackgroundOptions {
  /** Aesthetic id (default "sumi-e"). Cosmic/neon skip ink-wash registration. */
  aesthetic?: AestheticId;
  landscape?: SumiELandscapeVariant;
  paletteVariant?: SumiEPaletteVariant;
  /** Optional camera / viewport resolvers for scrolling games. */
  getCameraX?: InkWashEffectOptions["getCameraX"];
  getViewport?: InkWashEffectOptions["getViewport"];
  /** Force registration even if aesthetic is not sumi-e (e.g. dual themes). */
  force?: boolean;
  /** Custom effect name (default INK_WASH_EFFECT_NAME). */
  effectName?: string;
}

/**
 * Registers the ink-wash parallax background effect on the given renderer
 * when the chosen aesthetic uses ink-wash (or when force=true).
 *
 * Returns the resolved AestheticThemeConfig so callers can also apply palette/juice.
 */
export function registerSumiEBackground(
  renderer: Renderer<CoreComponentRegistry, RenderContext>,
  options: RegisterSumiEBackgroundOptions = {}
): AestheticThemeConfig {
  const theme = getAestheticTheme(options.aesthetic ?? "sumi-e", {
    landscape: options.landscape,
    paletteVariant: options.paletteVariant
  });

  const shouldRegister = options.force === true || theme.useInkWash;
  if (!shouldRegister) {
    return theme;
  }

  const effectOpts: InkWashEffectOptions = {
    layers: theme.inkWashLayers,
    inkColor: theme.foregroundColor,
    paperColor: theme.backgroundColor,
    getCameraX: options.getCameraX,
    getViewport: options.getViewport
  };

  const name = options.effectName ?? INK_WASH_EFFECT_NAME;

  if (renderer.type === "canvas") {
    renderer.registerBackgroundEffect(name, createInkWashCanvasEffect(effectOpts));
  } else if (renderer.type === "skia") {
    renderer.registerBackgroundEffect(name, createInkWashSkiaEffect(effectOpts) as never);
  }

  return theme;
}
