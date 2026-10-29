import type { ThemeModuleDescriptor } from "../../shared/presentation/AestheticModules";
import type { RacingPalette, TrackTheme } from "../rendering/RacingPalette";

export type RacingThemeModuleId = "classic";

/** Presentation: palettes + skins. No input, physics, or race rules. */
export interface RacingThemeModule extends ThemeModuleDescriptor {
  readonly id: RacingThemeModuleId;
  readonly palettes: Record<TrackTheme, RacingPalette>;
  /** Default skin id used when track does not specify one. */
  readonly defaultSkinId: string;
}
