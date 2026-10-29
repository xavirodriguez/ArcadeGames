import { colors } from "../../../theme/colors";

/**
 * Semantic neon tokens for Geometry Wars identity.
 * Drawers and entity spawn colors should prefer these over ad-hoc literals.
 */
export const GEOMETRY_WARS_VISUAL_TOKENS = {
  player: colors.cyan,
  playerDead: "gray",
  bullet: colors.gold,
  seeker: colors.pink,
  fastSeeker: colors.pink,
  chaser: colors.warning,
  evader: colors.cyan,
  grunt: colors.green,
  particleDefault: colors.white,
  grid: colors.border,
  trailPrimary: colors.gold,
  trailSecondary: colors.pink,
  invulnerableFlash: colors.white,
} as const;

export type GeometryWarsVisualTokens = typeof GEOMETRY_WARS_VISUAL_TOKENS;
