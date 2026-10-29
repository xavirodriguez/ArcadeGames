import type { Theme } from "@tiny-aster/core";
import type { CentipedeThemeModule, CentipedeThemeId } from "./types";
import { classicTheme } from "./classic/ClassicTheme";

const THEMES: Record<CentipedeThemeId, CentipedeThemeModule> = { classic: classicTheme };

export function resolveCentipedeTheme(_themeOrId?: Theme | string | null): CentipedeThemeModule {
  return THEMES.classic;
}

export { classicTheme, THEMES };
