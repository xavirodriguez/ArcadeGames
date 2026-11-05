/**
 * registerSumiEBackground.ts
 * One-call registration of the ink-wash parallax backdrop for any game renderer.
 *
 * Phase 1 of the Sumi-e background integration roadmap.
 * Phase 3/4: regional atmosphere, mist bands and quality/a11y settings are applied
 * when registering so consumers get the full residual feature set by default.
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
import {
  getRegionalAtmosphere,
  type SumiERegionId
} from "./SumiEAtmosphere";
import {
  resolveSumiERenderSettings,
  type SumiEQualityPreset,
  type AccessibilityOverrides
} from "./SumiEPerformance";

export interface RegisterSumiEBackgroundOptions {
  /** Aesthetic id (default "sumi-e"). Cosmic/neon skip ink-wash registration. */
  aesthetic?: AestheticId;
  landscape?: SumiELandscapeVariant;
  paletteVariant?: SumiEPaletteVariant;
  /**
   * Regional atmosphere preset (mountain | coast | forest | winter | village).
   * When omitted, derived from landscape (mountain → mountain, coastal → coast).
   */
  region?: SumiERegionId;
  /** Quality preset (default "high"). Controls layer count, mist, parallax. */
  quality?: SumiEQualityPreset;
  /** Accessibility overrides (reduceMotion, highContrast, disableParallax, disableParticles). */
  accessibility?: AccessibilityOverrides;
  /** Optional camera / viewport resolvers for scrolling games. */
  getCameraX?: InkWashEffectOptions["getCameraX"];
  getViewport?: InkWashEffectOptions["getViewport"];
  /** Force registration even if aesthetic is not sumi-e (e.g. dual themes). */
  force?: boolean;
  /** Custom effect name (default INK_WASH_EFFECT_NAME). */
  effectName?: string;
}

function landscapeToRegion(landscape?: SumiELandscapeVariant): SumiERegionId {
  switch (landscape) {
    case "mountain":
      return "mountain";
    case "coastal":
      return "coast";
    default:
      return "village";
  }
}

/**
 * Registers the ink-wash parallax background effect on the given renderer
 * when the chosen aesthetic uses ink-wash (or when force=true).
 *
 * Applies regional layer stacks, mist bands and quality/a11y settings so Phase 3/4
 * residual APIs are actually exercised in production render paths.
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

  const region = options.region ?? landscapeToRegion(options.landscape);
  const atmosphere = getRegionalAtmosphere(region);
  const settings = resolveSumiERenderSettings(
    options.quality ?? "high",
    options.accessibility ?? {}
  );

  // Prefer regional layers when the aesthetic is sumi-e; keep theme layers as fallback.
  const layers = atmosphere.layers.length > 0 ? atmosphere.layers : theme.inkWashLayers;

  const effectOpts: InkWashEffectOptions = {
    layers,
    inkColor: theme.foregroundColor,
    paperColor: theme.backgroundColor,
    getCameraX: options.getCameraX,
    getViewport: options.getViewport,
    mistBands: atmosphere.mist,
    settings,
    region
  };

  const name = options.effectName ?? INK_WASH_EFFECT_NAME;

  if (renderer.type === "canvas") {
    renderer.registerBackgroundEffect(name, createInkWashCanvasEffect(effectOpts));
  } else if (renderer.type === "skia") {
    renderer.registerBackgroundEffect(name, createInkWashSkiaEffect(effectOpts) as never);
  }

  return theme;
}
