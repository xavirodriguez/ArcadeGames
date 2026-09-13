import { COSMIC_ARCADE_PALETTE } from "./CosmicPalette";

export type PlanetType = "blue" | "purple" | "toxic" | "volcanic";

export interface PlanetTheme {
  type: PlanetType;
  bodyGradient: readonly [string, string, string];
  atmosphereColor: string;
  ringColors: readonly [string, string];
  ringColorBase: string;
  ringColorHighlight: string;
  fissureColor?: string;
}

export const PLANET_THEMES: Record<PlanetType, PlanetTheme> = {
  blue: {
    type: "blue",
    bodyGradient: [
      COSMIC_ARCADE_PALETTE.iceBlue,
      "#1a5276",
      COSMIC_ARCADE_PALETTE.cosmicNavy
    ],
    atmosphereColor: COSMIC_ARCADE_PALETTE.neonCyan,
    ringColors: [COSMIC_ARCADE_PALETTE.neonCyan, COSMIC_ARCADE_PALETTE.iceBlue],
    ringColorBase: COSMIC_ARCADE_PALETTE.iceBlue,
    ringColorHighlight: COSMIC_ARCADE_PALETTE.white
  },
  purple: {
    type: "purple",
    bodyGradient: [
      COSMIC_ARCADE_PALETTE.neonMagenta,
      COSMIC_ARCADE_PALETTE.nebulaPurple,
      COSMIC_ARCADE_PALETTE.deepSpace
    ],
    atmosphereColor: COSMIC_ARCADE_PALETTE.neonMagenta,
    ringColors: [COSMIC_ARCADE_PALETTE.neonMagenta, COSMIC_ARCADE_PALETTE.electricIndigo],
    ringColorBase: COSMIC_ARCADE_PALETTE.goldenRing,
    ringColorHighlight: COSMIC_ARCADE_PALETTE.goldenRingHighlight
  },
  toxic: {
    type: "toxic",
    bodyGradient: [
      COSMIC_ARCADE_PALETTE.alienGreen,
      "#1e4d2b",
      COSMIC_ARCADE_PALETTE.voidBlack
    ],
    atmosphereColor: COSMIC_ARCADE_PALETTE.alienGreen,
    ringColors: [COSMIC_ARCADE_PALETTE.alienGreen, COSMIC_ARCADE_PALETTE.plasmaYellow],
    ringColorBase: COSMIC_ARCADE_PALETTE.alienGreen,
    ringColorHighlight: COSMIC_ARCADE_PALETTE.plasmaYellow
  },
  volcanic: {
    type: "volcanic",
    bodyGradient: [
      COSMIC_ARCADE_PALETTE.solarOrange,
      COSMIC_ARCADE_PALETTE.dangerRed,
      "#2b0b10"
    ],
    atmosphereColor: COSMIC_ARCADE_PALETTE.solarOrange,
    ringColors: [COSMIC_ARCADE_PALETTE.solarOrange, COSMIC_ARCADE_PALETTE.dangerRed],
    ringColorBase: COSMIC_ARCADE_PALETTE.solarOrange,
    ringColorHighlight: COSMIC_ARCADE_PALETTE.plasmaYellow,
    fissureColor: COSMIC_ARCADE_PALETTE.plasmaYellow
  }
};

/**
 * Returns the planet theme config for a planet type.
 */
export function getPlanetTheme(type: PlanetType = "purple"): PlanetTheme {
  return PLANET_THEMES[type] || PLANET_THEMES.purple;
}
