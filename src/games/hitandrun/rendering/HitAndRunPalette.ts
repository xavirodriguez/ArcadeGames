/**
 * Hit&Run Color Palette + procedural backdrop theme tokens.
 * Tuned for a cinematic dusk battlefield / high-action platformer look.
 */
import type { BackdropThemeTokens } from "@tiny-aster/core";
import { ECHO_PALETTE } from "../../echorunner/rendering/EchoRunnerPalette";

export const HIT_PALETTE = {
  ...ECHO_PALETTE,
  hitRunRed: "#ff2244",
  hitRunYellow: "#ffcc00",
  hitRunSmoke: "rgba(255, 255, 255, 0.2)"
} as const;

/** Theme for generateBackdrop — dusk horizon, warm accent, cool depths. */
export const HIT_RUN_BACKDROP_THEME: BackdropThemeTokens = {
  skyGradientTop: "#07060f",
  skyGradientBottom: "#2a1838",
  mountainFar: "#1e1528",
  mountainMid: "#2c2038",
  hills: "#3a2a44",
  river: "#3a7a9a",
  waterfall: "#8fd4ff",
  accentGlow: "#ff5a7a",
  fogColor: "rgba(12, 8, 22, 0.55)",
  maskColor: "#05040a"
};
