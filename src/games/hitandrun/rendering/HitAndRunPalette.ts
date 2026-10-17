/**
 * Hit&Run Color Palette + procedural backdrop theme tokens.
 * Tuned for a cinematic dusk battlefield / high-action platformer look.
 */
import type { BackdropThemeTokens } from "@tiny-aster/core";
import { DEFAULT_ECHO_PALETTE } from "../../shared/rendering/PlatformerSharedVisualUtils";
import { colors, semanticColors } from "../../../theme/colors";

export const HIT_PALETTE = {
  ...DEFAULT_ECHO_PALETTE,
  hitRunRed: colors.redHot,
  hitRunYellow: colors.gold,
  hitRunSmoke: colors.overlay
} as const;

/** Theme for generateBackdrop — dusk horizon, warm accent, cool depths. */
export const HIT_RUN_BACKDROP_THEME: BackdropThemeTokens = {
  skyGradientTop: semanticColors.background.dark,
  skyGradientBottom: semanticColors.background.slate,
  mountainFar: colors.surface,
  mountainMid: colors.borderDark,
  hills: colors.slate,
  river: colors.blue,
  waterfall: colors.blueLight,
  accentGlow: colors.pink,
  fogColor: colors.overlay,
  maskColor: semanticColors.background.dark
};
