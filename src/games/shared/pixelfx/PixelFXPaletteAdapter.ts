/**
 * PixelFX Integration Layer — Theme variant selection (V1)
 *
 * V1 does NOT recolor pre-baked PNGs at runtime.
 * Colors are chosen at export time (PixelFX --opts palette) and stored as
 * distinct sheet variants registered in SpriteRegistry.
 *
 * This module only selects which sheetId variant to use for a theme.
 * Runtime tint is out of scope until Canvas and Skia share an equivalent
 * Sprite.tint contract.
 */

import type { PixelFXThemeVariant, PixelFXManifestEntry } from "./PixelFXTypes";

/**
 * Map ArcadeGames theme / aesthetic tags onto PixelFXThemeVariant.
 */
export function themeIdToVariant(themeId: string | undefined): PixelFXThemeVariant {
  if (!themeId) return "default";
  const t = themeId.toLowerCase();
  if (t.includes("sumi")) return "sumi-e";
  if (t.includes("iceberg") || t.includes("ice")) return "iceberg";
  if (t.includes("cosmic") || t.includes("neon") || t.includes("classic")) return "cosmic";
  if (t.includes("nature") || t.includes("forest")) return "nature";
  return "default";
}

/**
 * Resolve the concrete sheetId for an entry + variant.
 * Falls back to the default sheetId when the variant was not exported.
 */
export function selectSheetForVariant(
  entry: PixelFXManifestEntry,
  variant: PixelFXThemeVariant
): string {
  if (variant === "default") return entry.sheetId;
  return entry.variants?.[variant] ?? entry.sheetId;
}

/**
 * Documented build-time palette ramps for the export spike.
 * Used by tooling / scripts, not at runtime draw time.
 */
export const BUILD_TIME_PALETTE_HINTS: Record<
  PixelFXThemeVariant,
  readonly string[]
> = {
  default: ["#101010", "#303030", "#606060", "#909090", "#c0c0c0", "#ffffff"],
  cosmic: ["#1a0500", "#4a1000", "#a03000", "#e06010", "#ffb030", "#fff0c0"],
  "sumi-e": ["#1a1814", "#2e2a24", "#4a443c", "#6e665c", "#9a9080", "#d0c8b8"],
  iceberg: ["#081828", "#103050", "#185080", "#3090c0", "#70c0e8", "#e0f8ff"],
  nature: ["#0c1808", "#1c3010", "#305018", "#508028", "#80b040", "#d0e890"],
};
