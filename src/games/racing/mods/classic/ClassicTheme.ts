import type { RacingThemeModule } from "../types";
import { RACING_PALETTES } from "../../rendering/RacingPalette";

/**
 * Default tabletop / miniature racing aesthetic.
 * Palettes and skins remain the single source of truth in rendering/.
 */
export const classicTheme: RacingThemeModule = {
  id: "classic",
  displayName: "Tabletop Classic",
  palettes: RACING_PALETTES,
  defaultSkinId: "tabletop"
};
