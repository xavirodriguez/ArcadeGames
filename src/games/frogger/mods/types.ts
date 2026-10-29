import type { Renderer } from "@tiny-aster/core";
import type { ThemeModuleDescriptor } from "../../shared/presentation/AestheticModules";
import { FROGGER_VISUAL_TOKENS } from "../rendering/FroggerVisualTokens";

export type FroggerThemeId = "classic";

/** Presentation-only: tokens + renderer registration. No gameplay systems. */
export interface FroggerThemeModule extends ThemeModuleDescriptor {
  readonly id: FroggerThemeId;
  readonly tokens: typeof FROGGER_VISUAL_TOKENS;
  initializeRenderer: (renderer: Renderer) => void;
}
