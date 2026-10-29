import type { ThemeModuleDescriptor } from "../../shared/presentation/AestheticModules";
import { DEFAULT_ECHO_PALETTE } from "../../shared/rendering/PlatformerSharedVisualUtils";

export type EchoRunnerThemeId = "classic";

/**
 * Presentation-only. Reuses shared platformer palette defaults without
 * depending on the platformer game package.
 */
export interface EchoRunnerThemeModule extends ThemeModuleDescriptor {
  readonly id: EchoRunnerThemeId;
  readonly tokens: typeof DEFAULT_ECHO_PALETTE;
}
