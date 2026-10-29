import type { ThemeModuleDescriptor } from "../../shared/presentation/AestheticModules";
import { SHMUP_COLOR_TOKENS } from "../rendering/ShmupColorTokens";

export type VerticalShmupThemeId = "classic";

export interface VerticalShmupThemeModule extends ThemeModuleDescriptor {
  readonly id: VerticalShmupThemeId;
  readonly tokens: typeof SHMUP_COLOR_TOKENS;
}
