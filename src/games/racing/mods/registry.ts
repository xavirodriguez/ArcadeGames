import type { Theme } from "@tiny-aster/core";
import type { RacingThemeModule, RacingThemeModuleId } from "./types";
import { classicTheme } from "./classic/ClassicTheme";

const THEMES: Record<RacingThemeModuleId, RacingThemeModule> = {
  classic: classicTheme
};

export function resolveRacingTheme(_themeOrId?: Theme | string | null): RacingThemeModule {
  return THEMES.classic;
}

export { classicTheme, THEMES };
