import { Theme } from "@tiny-aster/core";

/** Concept pack ids that enable parchment chart + wind + island erosion. */
export const NAUTICAL_CHART_THEME_IDS = new Set(["aqui_hay_dragones", "nautical-chart"]);

export function isNauticalChartTheme(theme: Theme | undefined | null): boolean {
  const id = theme?.conceptPack?.id;
  return typeof id === "string" && NAUTICAL_CHART_THEME_IDS.has(id);
}

/**
 * Wind resource for Aquí hay dragones (art bible: wind deflects projectiles).
 * force: 0..3  (0 = calm).  sign: -1 left, +1 right.
 */
export interface NauticalWindState {
  force: number;
  sign: number;
  /** Seconds until next force/sign roll */
  changeRemaining: number;
  /** Visual: rhumb line intensity 0..1 */
  visualIntensity: number;
}

export const NAUTICAL_WIND_RESOURCE = "NauticalWind";

export function createDefaultWindState(): NauticalWindState {
  return {
    force: 1,
    sign: 1,
    changeRemaining: 6,
    visualIntensity: 0.25,
  };
}
