/**
 * SumiEPalette.ts
 * Shared palette tokens for the Sumi-e / shan-shui (ink-wash) aesthetic.
 * Used by AestheticTheme, InkWash backdrops, and game-specific Sumi-e themes.
 */

export interface SumiEPaletteTokens {
  /** Near-black ink for silhouettes and outlines. */
  ink: string;
  /** Secondary ink / mid-tone. */
  inkSoft: string;
  /** Parchment / paper background. */
  paper: string;
  /** Slightly warmer paper / floor. */
  paperWarm: string;
  /** Vermilion accent (seals, important UI). */
  vermilion: string;
  /** Muted gold / yellow accent. */
  gold: string;
  /** Soft blue-gray for distant mountains / water. */
  distantBlue: string;
  /** Dark elite / oni accent. */
  darkAccent: string;
  /** Aggressive red accent. */
  redAccent: string;
}

/** Canonical Sumi-e palette (medieval Japan / shan-shui inspired). */
export const SUMI_E_PALETTE: SumiEPaletteTokens = {
  ink: "#171817",
  inkSoft: "#2a2c2a",
  paper: "#e8e3d4",
  paperWarm: "#dcd6c2",
  vermilion: "#c0392b",
  gold: "#b8963e",
  distantBlue: "#3d6fa5",
  darkAccent: "#3d6fa5",
  redAccent: "#b53a2a"
};

/** Winter variant — cooler paper, softer ink. */
export const SUMI_E_WINTER_PALETTE: SumiEPaletteTokens = {
  ...SUMI_E_PALETTE,
  paper: "#eef0f2",
  paperWarm: "#e2e6ea",
  ink: "#1a1c1e",
  distantBlue: "#5a7a9a"
};

/** Forest / mountain variant — slightly greener undertone. */
export const SUMI_E_FOREST_PALETTE: SumiEPaletteTokens = {
  ...SUMI_E_PALETTE,
  paper: "#e4e6d8",
  paperWarm: "#d5d8c4",
  distantBlue: "#4a6b5a"
};

export type SumiEPaletteVariant = "classic" | "winter" | "forest";

export function getSumiEPalette(variant: SumiEPaletteVariant = "classic"): SumiEPaletteTokens {
  switch (variant) {
    case "winter":
      return SUMI_E_WINTER_PALETTE;
    case "forest":
      return SUMI_E_FOREST_PALETTE;
    default:
      return SUMI_E_PALETTE;
  }
}
