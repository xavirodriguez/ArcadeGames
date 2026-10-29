import type { ThemeModuleDescriptor } from "../../shared/presentation/AestheticModules";
import type { CentipedeVisualTokens } from "../rendering/CentipedeVisualTokens";

export type CentipedeThemeId = "classic";

export interface CentipedeThemeModule extends ThemeModuleDescriptor {
  readonly id: CentipedeThemeId;
  readonly tokens: CentipedeVisualTokens;
}
