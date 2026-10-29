import type { ThemeModuleDescriptor } from "../../shared/presentation/AestheticModules";
import { DEFAULT_ECHO_PALETTE } from "../../shared/rendering/PlatformerSharedVisualUtils";

export type PlatformerThemeId = "classic";

/**
 * Presentation-only. Same shared palette defaults as Echo Runner, but
 * registered only under the platformer game — no import of echorunner/*.
 */
export interface PlatformerThemeModule extends ThemeModuleDescriptor {
  readonly id: PlatformerThemeId;
  readonly tokens: typeof DEFAULT_ECHO_PALETTE;
}
