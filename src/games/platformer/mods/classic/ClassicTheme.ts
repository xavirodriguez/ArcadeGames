import type { PlatformerThemeModule } from "../types";
import { DEFAULT_ECHO_PALETTE } from "../../../shared/rendering/PlatformerSharedVisualUtils";

/** Default platformer aesthetic (shared palette, independent registry). */
export const classicTheme: PlatformerThemeModule = {
  id: "classic",
  displayName: "Platformer Classic",
  tokens: DEFAULT_ECHO_PALETTE
};
