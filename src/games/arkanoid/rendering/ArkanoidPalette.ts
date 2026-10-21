/**
 * Synthwave row-gradient palette for Arkanoid bricks.
 * Imp. 9 — colour by grid row; special kinds still override.
 */

export const ROW_GRADIENT_PALETTE = [
  "#FF00AA", // row 0 magenta
  "#FF8800", // row 1 orange
  "#FFE600", // row 2 yellow
  "#00FF66", // row 3 green
  "#00F3FF", // row 4 cyan
  "#CC00FF", // row 5+ purple
] as const;

export type RowPaletteColor = (typeof ROW_GRADIENT_PALETTE)[number];

/**
 * Returns the neon colour for a given grid row index.
 * Rows beyond the palette length clamp to the last entry.
 */
export function resolveRowColor(rowIndex: number): string {
  const idx = Math.max(0, Math.min(rowIndex, ROW_GRADIENT_PALETTE.length - 1));
  return ROW_GRADIENT_PALETTE[idx];
}
