/**
 * Hit&Run Color Palette + procedural backdrop theme tokens.
 */
import type { BackdropThemeTokens } from "@tiny-aster/core";
import { ECHO_PALETTE } from "../../echorunner/rendering/EchoRunnerPalette";

export const HIT_PALETTE = {
  ...ECHO_PALETTE,
  hitRunRed: "#ff2244",
  hitRunYellow: "#ffcc00",
  hitRunSmoke: "rgba(255, 255, 255, 0.2)"
} as const;

/** Theme for generateBackdrop — run-and-gun / dusk battlefield feel. */
export const HIT_RUN_BACKDROP_THEME: BackdropThemeTokens = {
  skyGradientTop: "#0a0a18",
  skyGradientBottom: "#1a1028",
  mountainFar: "#2a1a3a",
  mountainMid: "#3d2848",
  hills: "#4a3050",
  river: "#2a6090",
  waterfall: "#6ec8ff",
  accentGlow: "#ff4466",
  fogColor: "rgba(20, 10, 30, 0.45)",
  maskColor: "#000000"
};
