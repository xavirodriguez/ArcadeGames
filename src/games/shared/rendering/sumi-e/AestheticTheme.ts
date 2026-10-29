/**
 * AestheticTheme.ts
 * High-level aesthetic switch for the entire suite.
 *
 * Games can declare aesthetic: "sumi-e" | "cosmic" | "neon" and receive
 * consistent backdrop, palette and juice defaults without hard-coding per game.
 *
 * Semantic Sumi-e tokens are additive: legacy palette fields remain available
 * while new Canvas and React Native consumers can share the canonical token map.
 */

import {
  DEFAULT_INK_WASH_LAYERS,
  MOUNTAIN_INK_WASH_LAYERS,
  COASTAL_INK_WASH_LAYERS,
  type InkWashLayerSpec
} from "../InkWashParallaxBackdrop";
import {
  SUMI_E_PALETTE,
  getSumiEPalette,
  type SumiEPaletteTokens,
  type SumiEPaletteVariant
} from "./SumiEPalette";
import { COSMIC_ARCADE_PALETTE } from "../CosmicPalette";
import {
  SUMI_E_SEMANTIC_TOKENS,
  type SumiESemanticTokens
} from "../../../../theme/sumi-e/SumiESemanticTokens";

export type AestheticId = "sumi-e" | "cosmic" | "neon";

export type SumiELandscapeVariant = "default" | "mountain" | "coastal";

export interface AestheticThemeOptions {
  readonly landscape?: SumiELandscapeVariant;
  readonly paletteVariant?: SumiEPaletteVariant;
}

export interface AestheticThemeConfig {
  id: AestheticId;
  /** Human-readable name. */
  name: string;
  /** Legacy background color retained for existing backdrop consumers. */
  backgroundColor: string;
  /** Legacy foreground color retained for existing backdrop consumers. */
  foregroundColor: string;
  /** Legacy accent color retained for existing backdrop consumers. */
  accentColor: string;
  /** Whether ink-wash parallax should be used as primary backdrop. */
  useInkWash: boolean;
  /** Layer preset when useInkWash is true. */
  inkWashLayers: readonly InkWashLayerSpec[];
  /** Legacy game-specific Sumi-e palette; retained for existing renderers. */
  sumiPalette?: SumiEPaletteTokens;
  /**
   * Canonical role-based palette for new presentation consumers.
   * Present only for Sumi-e so existing cosmic/neon themes remain unchanged.
   */
  semanticTokens?: SumiESemanticTokens;
  /** Soft ambient intensity 0..1 (for glow / CRT). */
  ambientIntensity: number;
  /** Prefer muted juice (less shake, softer flashes). */
  preferSubtleJuice: boolean;
}

const SUMI_E_DEFAULT: AestheticThemeConfig = {
  id: "sumi-e",
  name: "Sumi-e / Shan-shui",
  backgroundColor: SUMI_E_PALETTE.paper,
  foregroundColor: SUMI_E_PALETTE.ink,
  accentColor: SUMI_E_PALETTE.vermilion,
  useInkWash: true,
  inkWashLayers: DEFAULT_INK_WASH_LAYERS,
  sumiPalette: SUMI_E_PALETTE,
  semanticTokens: SUMI_E_SEMANTIC_TOKENS,
  ambientIntensity: 0.25,
  preferSubtleJuice: true
};

const COSMIC_DEFAULT: AestheticThemeConfig = {
  id: "cosmic",
  name: "Cosmic Arcade",
  backgroundColor: COSMIC_ARCADE_PALETTE.voidBlack,
  foregroundColor: COSMIC_ARCADE_PALETTE.neonCyan,
  accentColor: COSMIC_ARCADE_PALETTE.neonMagenta,
  useInkWash: false,
  inkWashLayers: DEFAULT_INK_WASH_LAYERS,
  ambientIntensity: 0.6,
  preferSubtleJuice: false
};

const NEON_DEFAULT: AestheticThemeConfig = {
  id: "neon",
  name: "Neon Grid",
  backgroundColor: "#0a0a12",
  foregroundColor: "#00f0ff",
  accentColor: "#ff00aa",
  useInkWash: false,
  inkWashLayers: DEFAULT_INK_WASH_LAYERS,
  ambientIntensity: 0.75,
  preferSubtleJuice: false
};

const PRESETS: Record<AestheticId, AestheticThemeConfig> = {
  "sumi-e": SUMI_E_DEFAULT,
  cosmic: COSMIC_DEFAULT,
  neon: NEON_DEFAULT
};

/**
 * Returns a full AestheticThemeConfig, optionally specializing the Sumi-e landscape.
 * Legacy colors still follow SumiEPalette variants; semanticTokens always exposes
 * the canonical palette so migration can happen consumer by consumer.
 */
export function getAestheticTheme(
  id: AestheticId = "sumi-e",
  options?: AestheticThemeOptions
): AestheticThemeConfig {
  const base = { ...PRESETS[id] };

  if (id === "sumi-e") {
    const palette = getSumiEPalette(options?.paletteVariant ?? "classic");
    base.sumiPalette = palette;
    base.backgroundColor = palette.paper;
    base.foregroundColor = palette.ink;
    base.accentColor = palette.vermilion;
    base.semanticTokens = SUMI_E_SEMANTIC_TOKENS;

    switch (options?.landscape) {
      case "mountain":
        base.inkWashLayers = MOUNTAIN_INK_WASH_LAYERS;
        break;
      case "coastal":
        base.inkWashLayers = COASTAL_INK_WASH_LAYERS;
        break;
      default:
        base.inkWashLayers = DEFAULT_INK_WASH_LAYERS;
    }
  }

  return base;
}

/** Quick check helpers. */
export function isSumiE(theme: AestheticThemeConfig): boolean {
  return theme.id === "sumi-e";
}

export function shouldUseInkWash(theme: AestheticThemeConfig): boolean {
  return theme.useInkWash;
}
