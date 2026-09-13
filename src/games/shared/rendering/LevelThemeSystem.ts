import { COSMIC_ARCADE_PALETTE } from "./CosmicPalette";
import { ExplosionType } from "./ExplosionSystem";
import { PlanetType } from "./CelestialBodiesSystem";

export type LevelThemeName =
  | "deep_space"
  | "violet_nebula"
  | "industrial_orbit"
  | "volcanic_rift"
  | "alien_bloom";

export interface LevelVisualTheme {
  name: LevelThemeName;
  backgroundColor: string;
  nebulaPalette: readonly string[];
  starDensity: number;
  starSpeed: number;
  asteroidTint?: string;
  enemyAccent: string;
  playerAccent: string;
  ambientGlow: number;
  parallaxProfile: string;
  explosionProfile: ExplosionType;
  planetProfile?: PlanetType;
  stationProfile?: string;
  crtIntensity?: number;
}

export const LEVEL_THEME_PRESETS: Record<LevelThemeName, LevelVisualTheme> = {
  deep_space: {
    name: "deep_space",
    backgroundColor: COSMIC_ARCADE_PALETTE.voidBlack,
    nebulaPalette: [
      COSMIC_ARCADE_PALETTE.cosmicNavy,
      COSMIC_ARCADE_PALETTE.deepSpace,
      COSMIC_ARCADE_PALETTE.nebulaPurple
    ],
    starDensity: 1.0,
    starSpeed: 1.0,
    enemyAccent: COSMIC_ARCADE_PALETTE.neonMagenta,
    playerAccent: COSMIC_ARCADE_PALETTE.neonCyan,
    ambientGlow: 0.5,
    parallaxProfile: "standard",
    explosionProfile: "small",
    planetProfile: "blue",
    crtIntensity: 0.15
  },
  violet_nebula: {
    name: "violet_nebula",
    backgroundColor: COSMIC_ARCADE_PALETTE.deepSpace,
    nebulaPalette: [
      COSMIC_ARCADE_PALETTE.nebulaPurple,
      COSMIC_ARCADE_PALETTE.electricIndigo,
      COSMIC_ARCADE_PALETTE.neonMagenta
    ],
    starDensity: 0.8,
    starSpeed: 0.8,
    enemyAccent: COSMIC_ARCADE_PALETTE.neonMagenta,
    playerAccent: COSMIC_ARCADE_PALETTE.iceBlue,
    ambientGlow: 0.7,
    parallaxProfile: "dense_nebula",
    explosionProfile: "alien",
    planetProfile: "purple",
    crtIntensity: 0.2
  },
  industrial_orbit: {
    name: "industrial_orbit",
    backgroundColor: COSMIC_ARCADE_PALETTE.cosmicNavy,
    nebulaPalette: [
      COSMIC_ARCADE_PALETTE.electricIndigo,
      COSMIC_ARCADE_PALETTE.mutedBlue,
      COSMIC_ARCADE_PALETTE.deepSpace
    ],
    starDensity: 1.2,
    starSpeed: 1.2,
    enemyAccent: COSMIC_ARCADE_PALETTE.solarOrange,
    playerAccent: COSMIC_ARCADE_PALETTE.neonCyan,
    ambientGlow: 0.6,
    parallaxProfile: "station_orbit",
    explosionProfile: "tech",
    planetProfile: "blue",
    stationProfile: "active",
    crtIntensity: 0.1
  },
  volcanic_rift: {
    name: "volcanic_rift",
    backgroundColor: COSMIC_ARCADE_PALETTE.voidBlack,
    nebulaPalette: [
      COSMIC_ARCADE_PALETTE.dangerRed,
      COSMIC_ARCADE_PALETTE.solarOrange,
      COSMIC_ARCADE_PALETTE.deepSpace
    ],
    starDensity: 0.6,
    starSpeed: 1.5,
    asteroidTint: COSMIC_ARCADE_PALETTE.solarOrange,
    enemyAccent: COSMIC_ARCADE_PALETTE.dangerRed,
    playerAccent: COSMIC_ARCADE_PALETTE.plasmaYellow,
    ambientGlow: 0.8,
    parallaxProfile: "volcanic_ash",
    explosionProfile: "boss",
    planetProfile: "volcanic",
    crtIntensity: 0.25
  },
  alien_bloom: {
    name: "alien_bloom",
    backgroundColor: COSMIC_ARCADE_PALETTE.voidBlack,
    nebulaPalette: [
      COSMIC_ARCADE_PALETTE.alienGreen,
      COSMIC_ARCADE_PALETTE.electricIndigo,
      COSMIC_ARCADE_PALETTE.nebulaPurple
    ],
    starDensity: 0.9,
    starSpeed: 0.9,
    enemyAccent: COSMIC_ARCADE_PALETTE.alienGreen,
    playerAccent: COSMIC_ARCADE_PALETTE.neonCyan,
    ambientGlow: 0.65,
    parallaxProfile: "organic_dust",
    explosionProfile: "alien",
    planetProfile: "toxic",
    crtIntensity: 0.15
  }
};

/**
 * Returns the theme preset configuration for a given level theme name.
 */
export function getLevelTheme(name: LevelThemeName = "deep_space"): LevelVisualTheme {
  return LEVEL_THEME_PRESETS[name] || LEVEL_THEME_PRESETS.deep_space;
}
