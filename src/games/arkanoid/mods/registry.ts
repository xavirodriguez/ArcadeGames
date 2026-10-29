import type { Theme } from "@tiny-aster/core";
import type { ArkanoidThemeModule, ArkanoidThemeId } from "./types";
import { classicTheme } from "./classic/ClassicTheme";

const THEMES: Record<ArkanoidThemeId, ArkanoidThemeModule> = { classic: classicTheme };

export function resolveArkanoidTheme(_themeOrId?: Theme | string | null): ArkanoidThemeModule {
  return THEMES.classic;
}

export { classicTheme, THEMES };
