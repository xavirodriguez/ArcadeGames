import { colors } from "../../../theme/colors";

/**
 * Canonical visual roles used by Geometry Wars entity creation and both renderers.
 * Backend fallbacks preserve the existing Canvas and Skia appearance where they differ.
 */
export const GEOMETRY_WARS_VISUAL_TOKENS = {
  player: colors.cyan,
  playerDead: "gray",
  bullet: colors.gold,
  seeker: colors.pink,
  fastSeeker: colors.pink,
  chaser: colors.pink,
  evader: colors.green,
  legacyEvader: "#ffaa00",
  grunt: colors.cyan,
  particleDefault: colors.white,
  grid: colors.border,
  trailPrimary: colors.gold,
  trailSecondary: colors.pink,
  fallbacks: {
    canvas: {
      bullet: colors.gold,
      seeker: colors.pink,
      fastSeeker: colors.pink,
      chaser: colors.pink,
      evader: colors.warning,
      trailPrimary: colors.gold,
      trailSecondary: colors.pink,
      grid: colors.border
    },
    skia: {
      bullet: colors.yellow,
      seeker: colors.magenta,
      fastSeeker: colors.danger,
      chaser: colors.magenta,
      evader: colors.warning,
      trailPrimary: colors.yellow,
      trailSecondary: colors.magenta,
      grid: colors.border
    }
  }
} as const;

export type GeometryWarsVisualTokens = typeof GEOMETRY_WARS_VISUAL_TOKENS;
