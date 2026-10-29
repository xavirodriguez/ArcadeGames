import type { Theme } from "@tiny-aster/core";
import type { TowerDefenseThemeModule, TowerDefenseThemeId } from "./types";
import { classicTheme } from "./classic/ClassicTheme";

const THEMES: Record<TowerDefenseThemeId, TowerDefenseThemeModule> = {
  classic: classicTheme
};

export function resolveTowerDefenseTheme(_themeOrId?: Theme | string | null): TowerDefenseThemeModule {
  return THEMES.classic;
}

export { classicTheme, THEMES };
