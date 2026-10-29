import type { ThemeModuleDescriptor } from "../../shared/presentation/AestheticModules";
import type { HitRunTheme, HitRunThemePaletteTokens } from "../rendering/theme/HitRunTheme";

export type HitAndRunThemeId = "fantasy" | "sumi-e";

/**
 * Thin facade over the existing HitRunTheme system for monorepo parity.
 * Does not replace ThemeRegistry or HitRunTheme render methods.
 */
export interface HitAndRunThemeModule extends ThemeModuleDescriptor {
  readonly id: HitAndRunThemeId;
  readonly palette: HitRunThemePaletteTokens;
  /** Lazily constructs the full HitRunTheme (drawers, HUD, feedback). */
  createTheme: () => HitRunTheme;
}
