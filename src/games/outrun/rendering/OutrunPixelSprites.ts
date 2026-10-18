import { colors } from "../../../theme/colors";

export type OutrunPixelColor = "b" | "d" | "g" | "h" | "p" | "r" | "R" | "t";

export interface OutrunPixelSprite {
  readonly width: number;
  readonly height: number;
  readonly frames: readonly (readonly string[])[];
}

/**
 * Original, low-resolution rear-view sprites. The grid is the source asset;
 * renderers rasterize the same authored pixels at runtime to preserve parity.
 */
export const OUTRUN_PLAYER_PIXEL_SPRITE: OutrunPixelSprite = {
  width: 16,
  height: 9,
  frames: [
    [
      "....tttttttt....",
      "..ttbbbbbbbbtt..",
      ".tbbbbbbbbbbbbt.",
      "tbbbbbbbbbbbbbbt",
      "tbbhhhhhhhhhhbbt",
      "tbbggggggggggbbt",
      "tbbggggggggggbbt",
      "ttbbrrbbppbbrrtt",
      "..ttddddddddtt.."
    ],
    [
      "....tttttttt....",
      "..ttbbbbbbbbtt..",
      ".tbbbbbbbbbbbbt.",
      "tbbbbbbbbbbbbbbt",
      "tbbhhhhhhhhhhbbt",
      "tbbggggggggggbbt",
      "tbbggggggggggbbt",
      "ttbbRRbbppbbRRtt",
      "..ttddddddddtt.."
    ]
  ]
};

export const OUTRUN_TRAFFIC_PIXEL_SPRITE: OutrunPixelSprite = {
  width: 12,
  height: 8,
  frames: [
    [
      "...tttttt...",
      "..ttbbbbtt..",
      ".tbbbbbbbbt.",
      "tbbbbbbbbbbt",
      "tbbhhhhhhbbt",
      "tbbggggggbbt",
      "ttbbrrbbrrtt",
      "..ttddddtt.."
    ],
    [
      "...tttttt...",
      "..ttbbbbtt..",
      ".tbbbbbbbbt.",
      "tbbbbbbbbbbt",
      "tbbhhhhhhbbt",
      "tbbggggggbbt",
      "ttbbRRbbRRtt",
      "..ttddddtt.."
    ]
  ]
};

/** Two-frame animation driven only by deterministic world distance. */
export function getOutrunAnimationFrame(distance: number): number {
  if (!Number.isFinite(distance)) return 0;
  const phase = Math.floor(Math.max(0, distance) / 400);
  return phase % 2;
}

export type OutrunPixelRunVisitor = (
  color: OutrunPixelColor,
  x: number,
  y: number,
  width: number,
  height: number
) => void;

/** Visit horizontal runs of equal pixels without allocating intermediate arrays. */
export function visitOutrunPixelRuns(
  rows: readonly string[],
  originX: number,
  originY: number,
  pixelSize: number,
  visitor: OutrunPixelRunVisitor
): void {
  for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex]!;
    let column = 0;

    while (column < row.length) {
      const pixel = row[column]!;
      if (pixel === ".") {
        column++;
        continue;
      }

      const start = column;
      while (column < row.length && row[column] === pixel) column++;
      visitor(
        pixel as OutrunPixelColor,
        originX + start * pixelSize,
        originY + rowIndex * pixelSize,
        (column - start) * pixelSize,
        pixelSize
      );
    }
  }
}

export function resolveOutrunPixelColor(
  pixel: OutrunPixelColor,
  bodyColor: string
): string {
  switch (pixel) {
    case "b": return bodyColor;
    case "d": return colors.backgroundDark;
    case "g": return colors.borderDark;
    case "h": return colors.white;
    case "p": return colors.yellow;
    case "r": return colors.orangeDark;
    case "R": return colors.red;
    case "t": return colors.surface;
  }
}
