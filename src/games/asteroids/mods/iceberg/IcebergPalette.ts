/**
 * Color tokens for the Iceberg (Borealis / Cristal Glaciar) art direction.
 * Source of truth: src/games/asteroids/ART_ICEBERG.md
 *
 * @public
 */
export const ICEBERG_PALETTE = {
  oceanBase: "#0E1628",
  icebergFar: "#1A2C4E",
  iceLight: "#E8F4F8",
  iceMid: "#9AC5DB",
  iceDark: "#5A8BA8",
  shipHull: "#FF6B4A",
  shipShade: "#D64927",
  shipDeck: "#2D3B4E",
  thermalBeam: "#FFD15C",
  hazardAlert: "#FF455B",
  hudText: "#FFF6E5",
  aurora: "#4EF2B7",
  abyssShadow: "rgba(5, 12, 28, 0.7)"
} as const;

export type IcebergPaletteKey = keyof typeof ICEBERG_PALETTE;
