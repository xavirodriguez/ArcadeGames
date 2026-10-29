import { colors } from "../../../theme/colors";

/** Minimal neon tokens for Pong presentation. */
export const PONG_VISUAL_TOKENS = {
  ball: colors.white,
  paddle: colors.white,
  centerLine: colors.white,
  scoreP1: colors.pink,
  scoreP2: colors.cyan,
  glowP1: colors.pink,
  glowP2: colors.cyan,
  net: colors.cyan,
} as const;

export type PongVisualTokens = typeof PONG_VISUAL_TOKENS;
