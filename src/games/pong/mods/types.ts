import type { ThemeModuleDescriptor } from "../../shared/presentation/AestheticModules";
import type { PongVisualTokens } from "../rendering/PongVisualTokens";

export type PongThemeId = "classic";

export interface PongThemeModule extends ThemeModuleDescriptor {
  readonly id: PongThemeId;
  readonly tokens: PongVisualTokens;
}
