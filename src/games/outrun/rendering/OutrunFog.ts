/**
 * Shared atmospheric fog model for Out Run (Session 3).
 *
 * Single source of truth for fog intensity + color consumed by Canvas and Skia.
 * Palette selection remains in OutrunPalettes / resolveOutrunRoadContext.
 *
 * Input: `ProjectedSegment.fog` from projectRoad — linear distance factor in
 * [0, 1] (0 = near camera, 1 = drawDistance).
 *
 * Curve: smoothstep without a hard threshold (replaces Canvas's abrupt >0.4).
 * Color: far sky-band token of the active scenario palette (OUTRUN_ART tokens).
 */

import type { ScenarioPalette } from "./OutrunPalettes";
import { colors } from "../../../theme/colors";

export interface SegmentFogStyle {
  /** Alpha in [0, maxAlpha]; 0 means skip drawing fog for this segment. */
  alpha: number;
  /** CSS rgba() string for Canvas and Skia color parsing. */
  rgba: string;
}

/** Smoothstep 0→1. */
export function smoothstep(t: number): number {
  const x = t < 0 ? 0 : t > 1 ? 1 : t;
  return x * x * (3 - 2 * x);
}

/**
 * Fog intensity from linear buffer fog factor.
 * @param distanceFog - ProjectedSegment.fog in [0, 1]
 * @param maxAlpha - peak opacity at drawDistance (default 0.55)
 */
export function fogIntensity(distanceFog: number, maxAlpha = 0.55): number {
  const t = distanceFog < 0 ? 0 : distanceFog > 1 ? 1 : distanceFog;
  return smoothstep(t) * maxAlpha;
}

/** Parse a #RGB / #RRGGBB token to [r,g,b] 0–255. */
export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  if (h.length === 3) {
    return [
      parseInt(h[0] + h[0], 16),
      parseInt(h[1] + h[1], 16),
      parseInt(h[2] + h[2], 16)
    ];
  }
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16)
  ];
}

/**
 * Shared decision: buffer fog + palette → alpha + rgba.
 * Both Canvas and Skia must call this; no divergent intensity/color logic.
 *
 * Layers affected (by callers): full segment strip (grass+rumble+road).
 * Sprites/horizon not fogged this session (intentional residual).
 */
export function resolveSegmentFog(
  distanceFog: number,
  palette: ScenarioPalette,
  maxAlpha = 0.55
): SegmentFogStyle {
  const alpha = fogIntensity(distanceFog, maxAlpha);
  if (alpha <= 0.001) {
    return { alpha: 0, rgba: "rgba" + "(" + 0 + ", " + 0 + ", " + 0 + ", " + 0 + ")" };
  }
  const bands = palette.skyBands;
  const farBand = bands[bands.length - 1] ?? bands[0] ?? colors.cyan;
  const [r, g, b] = hexToRgb(farBand);
  const a = Math.round(alpha * 1000) / 1000;
  return { alpha: a, rgba: "rgba" + "(" + r + ", " + g + ", " + b + ", " + a + ")" };
}


/**
 * Resolve the shared fog tint at a specific opacity. Both renderers use this
 * in one continuous vertical gradient instead of painting one strip per segment.
 */
export function resolveRoadFogColor(palette: ScenarioPalette, alpha: number): string {
  const bands = palette.skyBands;
  const farBand = bands[bands.length - 1] ?? bands[0] ?? colors.cyan;
  const [r, g, b] = hexToRgb(farBand);
  const opacity = Math.min(1, Math.max(0, alpha));
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}
