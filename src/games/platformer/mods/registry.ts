import type { Theme } from "@tiny-aster/core";
import type { PlatformerThemeModule, PlatformerThemeId } from "./types";
import { classicTheme } from "./classic/ClassicTheme";

const THEMES: Record<PlatformerThemeId, PlatformerThemeModule> = { classic: classicTheme };

export function resolvePlatformerTheme(_themeOrId?: Theme | string | null): PlatformerThemeModule {
  return THEMES.classic;
}

export { classicTheme, THEMES };
