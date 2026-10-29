import type { FroggerThemeModule } from "../types";
import { FROGGER_VISUAL_TOKENS } from "../../rendering/FroggerVisualTokens";
import { initializeFroggerRenderer } from "../../rendering/FroggerPresentation";

/**
 * Default "Hora punta" Frogger aesthetic. Presentation only.
 */
export const classicTheme: FroggerThemeModule = {
  id: "classic",
  displayName: "Hora punta",
  tokens: FROGGER_VISUAL_TOKENS,
  initializeRenderer: initializeFroggerRenderer
};
