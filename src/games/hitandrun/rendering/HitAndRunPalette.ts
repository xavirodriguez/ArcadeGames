/**
 * Hit&Run Color Palette + procedural backdrop theme tokens.
 * Phase 3: dark fantasy dusk battlefield.
 */
import type { BackdropThemeTokens } from "@tiny-aster/core";
import { DEFAULT_ECHO_PALETTE } from "../../shared/rendering/PlatformerSharedVisualUtils";
import { colors, semanticColors } from "../../../theme/colors";

export const HIT_PALETTE = {
  ...DEFAULT_ECHO_PALETTE,
  hitRunRed: colors.redHot,
  hitRunYellow: colors.gold,
  hitRunSmoke: colors.overlay,
  // Fantasy accents
  goblinGreen: "#3d8b4f",
  bone: "#c4b59a",
  wraithViolet: "#7c6bb0",
  cursedGold: "#c9a227",
  ironMoss: "#5c6b4a"
} as const;

/** Theme for generateBackdrop — deep dusk forest → citadel. */
export const HIT_RUN_BACKDROP_THEME: BackdropThemeTokens = {
  skyGradientTop: "#0a0612",
  skyGradientBottom: "#1a1228",
  mountainFar: "#1e1a2e",
  mountainMid: "#2a2438",
  hills: "#243028",
  river: "#2a4060",
  waterfall: "#3a5a80",
  accentGlow: "#c45c8a",
  fogColor: "rgba(10, 8, 20, 0.55)",
  maskColor: "#0a0612"
};
