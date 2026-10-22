import type { OutrunConfig } from "../types/OutrunConfigSchema";
import type { OutrunHour, OutrunPaletteMode, OutrunPaletteTokens } from "../types/OutrunVisualTypes";
import { paletteForHour } from "../utils/palette";

export interface OutrunPaletteContrastResult {
  mode: OutrunPaletteMode;
  hour: OutrunHour;
  carColor: string;
  roadColor: string;
  contrastRatio: number;
  meetsMinimum: boolean;
}

export const OUTRUN_REQUIRED_CAR_ROAD_CONTRAST = 3;
export const OUTRUN_AUDIT_HOURS: readonly OutrunHour[] = [
  "dawn", "noon", "afternoon", "twilight", "night"
];

function parseHexColor(hex: string): [number, number, number] {
  const normalized = hex.startsWith("#") ? hex.slice(1) : hex;
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
    throw new Error(`Invalid six-digit HEX color: ${hex}`);
  }
  return [
    Number.parseInt(normalized.slice(0, 2), 16) / 255,
    Number.parseInt(normalized.slice(2, 4), 16) / 255,
    Number.parseInt(normalized.slice(4, 6), 16) / 255
  ];
}

function linearizeSrgb(channel: number): number {
  return channel <= 0.04045
    ? channel / 12.92
    : ((channel + 0.055) / 1.055) ** 2.4;
}

/** WCAG relative luminance for an opaque sRGB HEX color. */
export function relativeLuminance(hex: string): number {
  const [redChannel, greenChannel, blueChannel] = parseHexColor(hex);
  const red = linearizeSrgb(redChannel);
  const green = linearizeSrgb(greenChannel);
  const blue = linearizeSrgb(blueChannel);
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

/** WCAG contrast ratio for two opaque sRGB HEX colors. */
export function contrastRatio(foreground: string, background: string): number {
  const first = relativeLuminance(foreground);
  const second = relativeLuminance(background);
  const lighter = Math.max(first, second);
  const darker = Math.min(first, second);
  return (lighter + 0.05) / (darker + 0.05);
}

function resolveTokens(
  config: OutrunConfig,
  mode: OutrunPaletteMode,
  hour: OutrunHour
): OutrunPaletteTokens {
  return mode === "colorblind"
    ? paletteForHour(hour, config.visual.paletteColorblind)
    : paletteForHour(hour, config.visual.palette);
}

/** Audit car-to-road contrast for every configured time of day, including twilight. */
export function auditOutrunPaletteContrast(config: OutrunConfig): OutrunPaletteContrastResult[] {
  const results: OutrunPaletteContrastResult[] = [];
  for (const mode of ["default", "colorblind"] as const) {
    for (const hour of OUTRUN_AUDIT_HOURS) {
      const tokens = resolveTokens(config, mode, hour);
      const carColor = config.visual.palette.shared.car;
      const roadColor = tokens.roadNear;
      const ratio = contrastRatio(carColor, roadColor);
      results.push({
        mode, hour, carColor, roadColor, contrastRatio: ratio,
        meetsMinimum: ratio >= OUTRUN_REQUIRED_CAR_ROAD_CONTRAST
      });
    }
  }
  return results;
}
