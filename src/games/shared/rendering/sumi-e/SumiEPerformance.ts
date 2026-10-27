/**
 * SumiEPerformance.ts
 * Phase 4: performance presets and accessibility toggles for ink-wash rendering.
 */

import type { InkWashLayerSpec } from "../InkWashParallaxBackdrop";
import { DEFAULT_INK_WASH_LAYERS, MOUNTAIN_INK_WASH_LAYERS, COASTAL_INK_WASH_LAYERS } from "../InkWashParallaxBackdrop";
import { ATMOSPHERE_INK_WASH_LAYERS } from "./SumiEAtmosphere";

export type SumiEQualityPreset = "low" | "medium" | "high" | "ultra";

export interface SumiERenderSettings {
  quality: SumiEQualityPreset;
  /** Silhouette sampling step in px (higher = cheaper). */
  step: number;
  /** Max ink-wash layers to draw. */
  maxLayers: number;
  /** Draw parchment / paper fill. */
  paperFill: boolean;
  /** Soft mist bands. */
  mist: boolean;
  /** Ambient particles (petals, birds, ink dots). */
  ambientParticles: boolean;
  /** Parallax scroll (false = static backdrop). */
  parallax: boolean;
  /** Screen shake / strong juice (accessibility). */
  reduceMotion: boolean;
  /** Boost ink/paper contrast for readability. */
  highContrast: boolean;
  /** Global alpha scale on ink silhouettes. */
  alphaScale: number;
}

const PRESET_TABLE: Record<SumiEQualityPreset, Omit<SumiERenderSettings, "quality" | "reduceMotion" | "highContrast">> = {
  low: {
    step: 64,
    maxLayers: 2,
    paperFill: true,
    mist: false,
    ambientParticles: false,
    parallax: false,
    alphaScale: 1
  },
  medium: {
    step: 48,
    maxLayers: 3,
    paperFill: true,
    mist: true,
    ambientParticles: false,
    parallax: true,
    alphaScale: 1
  },
  high: {
    step: 40,
    maxLayers: 4,
    paperFill: true,
    mist: true,
    ambientParticles: true,
    parallax: true,
    alphaScale: 1
  },
  ultra: {
    step: 28,
    maxLayers: 6,
    paperFill: true,
    mist: true,
    ambientParticles: true,
    parallax: true,
    alphaScale: 1
  }
};

export interface AccessibilityOverrides {
  reduceMotion?: boolean;
  highContrast?: boolean;
  disableParallax?: boolean;
  disableParticles?: boolean;
}

/**
 * Builds final render settings from a quality preset + accessibility flags.
 */
export function resolveSumiERenderSettings(
  quality: SumiEQualityPreset = "high",
  a11y: AccessibilityOverrides = {}
): SumiERenderSettings {
  const base = PRESET_TABLE[quality] ?? PRESET_TABLE.high;
  const reduceMotion = a11y.reduceMotion === true;
  const highContrast = a11y.highContrast === true;

  return {
    quality,
    step: base.step,
    maxLayers: base.maxLayers,
    paperFill: base.paperFill,
    mist: reduceMotion ? false : base.mist,
    ambientParticles: a11y.disableParticles || reduceMotion ? false : base.ambientParticles,
    parallax: a11y.disableParallax || reduceMotion ? false : base.parallax,
    reduceMotion,
    highContrast,
    alphaScale: highContrast ? 1.25 : base.alphaScale
  };
}

/**
 * Trims a layer stack according to maxLayers (keeps farthest → nearest order).
 */
export function selectLayers(
  layers: readonly InkWashLayerSpec[],
  maxLayers: number
): readonly InkWashLayerSpec[] {
  if (layers.length <= maxLayers) return layers;
  // Prefer keeping a spread across depth: take evenly spaced indices
  const out: InkWashLayerSpec[] = [];
  const n = layers.length;
  for (let i = 0; i < maxLayers; i++) {
    const idx = Math.round((i * (n - 1)) / Math.max(1, maxLayers - 1));
    out.push(layers[idx]);
  }
  return out;
}

export type LayerStackId = "default" | "mountain" | "coastal" | "atmosphere";

export function getLayerStack(id: LayerStackId = "default"): readonly InkWashLayerSpec[] {
  switch (id) {
    case "mountain":
      return MOUNTAIN_INK_WASH_LAYERS;
    case "coastal":
      return COASTAL_INK_WASH_LAYERS;
    case "atmosphere":
      return ATMOSPHERE_INK_WASH_LAYERS;
    default:
      return DEFAULT_INK_WASH_LAYERS;
  }
}

/**
 * High-contrast ink/paper pair when accessibility.highContrast is on.
 */
export function contrastColors(highContrast: boolean): { ink: string; paper: string } {
  if (highContrast) {
    return { ink: "#0a0a0a", paper: "#f5f2e8" };
  }
  return { ink: "#171817", paper: "#e8e3d4" };
}
