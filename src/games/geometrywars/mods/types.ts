import type { ThemeModuleDescriptor } from "../../shared/presentation/AestheticModules";
import type { GeometryWarsVisualTokens } from "../rendering/GeometryWarsVisualTokens";

export type GeometryWarsThemeId = "neon";

/** Presentation-only neon identity. No gameplay systems. */
export interface GeometryWarsThemeModule extends ThemeModuleDescriptor {
  readonly id: GeometryWarsThemeId;
  readonly tokens: GeometryWarsVisualTokens;
}
