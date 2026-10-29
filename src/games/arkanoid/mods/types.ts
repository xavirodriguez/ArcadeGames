import type { ThemeModuleDescriptor } from "../../shared/presentation/AestheticModules";
import { ROW_GRADIENT_PALETTE } from "../rendering/ArkanoidPalette";

export type ArkanoidThemeId = "classic";

export interface ArkanoidThemeModule extends ThemeModuleDescriptor {
  readonly id: ArkanoidThemeId;
  readonly tokens: { readonly rowGradient: typeof ROW_GRADIENT_PALETTE };
}
