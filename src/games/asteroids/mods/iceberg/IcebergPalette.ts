/**
 * Color and lighting tokens for Borealis / Cristal Glaciar (ART_ICEBERG.md).
 * Presentation-only — never read by simulation systems.
 *
 * @public
 */
export const ICEBERG_PALETTE = {
  /** Arctic ocean background base. */
  oceanBase: "#0E1628",
  /** Distant pack-ice / far icebergs. */
  icebergFar: "#1A2C4E",
  /** Lit ice facet (facing the polar sun). */
  iceLight: "#E8F4F8",
  /** Side ice facet. */
  iceMid: "#9AC5DB",
  /** Shadowed ice facet. */
  iceDark: "#5A8BA8",
  /** Icebreaker hull — warm accent, highest saturation on screen. */
  shipHull: "#FF6B4A",
  /** Hull shade / port side. */
  shipShade: "#D64927",
  /** Metal bridge / deck. */
  shipDeck: "#2D3B4E",
  /** Thermal cannon beam and thrust blocks. */
  thermalBeam: "#FFD15C",
  /** Unstable / hazard ice. */
  hazardAlert: "#FF455B",
  /** HUD numerals and markers. */
  hudText: "#FFF6E5",
  /** Geometric aurora bands (use ~15% alpha). */
  aurora: "#4EF2B7",
  /** Hard shadow projected on water. */
  abyssShadow: "rgba(5, 12, 28, 0.7)"
} as const;

export type IcebergPaletteKey = keyof typeof ICEBERG_PALETTE;

/**
 * Unified polar light — top-left, matching ART_ICEBERG.md.
 * Used by facet shading (dot product with edge normals).
 */
export const ICEBERG_LIGHT_DIR = { x: -0.6, y: -0.8 } as const;

/** Hard paper-cut shadow offset on the ocean plane (px at 1× scale). */
export const ICEBERG_SHADOW_OFFSET = { x: 4, y: 6 } as const;

/** Three-tone keys for ice / hull faceting. */
export type IcebergFacetTone = "light" | "mid" | "dark";

/** Resolve palette hex for a facet tone on ice. */
export function iceToneColor(tone: IcebergFacetTone): string {
  if (tone === "light") return ICEBERG_PALETTE.iceLight;
  if (tone === "dark") return ICEBERG_PALETTE.iceDark;
  return ICEBERG_PALETTE.iceMid;
}

/** Resolve palette hex for a facet tone on the icebreaker hull. */
export function hullToneColor(tone: IcebergFacetTone): string {
  if (tone === "light") return ICEBERG_PALETTE.shipHull;
  if (tone === "dark") return ICEBERG_PALETTE.shipShade;
  return ICEBERG_PALETTE.shipHull;
}
