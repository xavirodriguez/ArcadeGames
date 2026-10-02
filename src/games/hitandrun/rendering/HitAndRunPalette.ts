/**
  * Hit&Run Color Palette
  * Cloned from EchoRunner "The Archive" palette — ready for kids / violent variants.
  */
import { ECHO_PALETTE } from "../../echorunner/rendering/EchoRunnerPalette";

/**
  * Hit&Run Color Palette
  * Re-exports and extends EchoRunner palette for Hit&Run specific visual themes.
  */
export const HIT_PALETTE = {
  ...ECHO_PALETTE,
  // Custom Overrides for Hit&Run High-Action Theme
  hitRunRed: "#ff2244",
  hitRunYellow: "#ffcc00",
  hitRunSmoke: "rgba(255, 255, 255, 0.2)"
} as const;
