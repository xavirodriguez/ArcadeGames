import type { ThemeModuleDescriptor } from "../../shared/presentation/AestheticModules";
import type { TowerDefenseVisualTokens } from "../rendering/TowerDefenseVisualTokens";

export type TowerDefenseThemeId = "classic";

/** Presentation tokens / role keys. No tower economy or combat rules. */
export interface TowerDefenseThemeModule extends ThemeModuleDescriptor {
  readonly id: TowerDefenseThemeId;
  readonly tokens: TowerDefenseVisualTokens;
}
