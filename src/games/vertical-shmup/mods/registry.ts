import type { Theme } from "@tiny-aster/core";
import type { VerticalShmupThemeModule, VerticalShmupThemeId } from "./types";
import { classicTheme } from "./classic/ClassicTheme";

const THEMES: Record<VerticalShmupThemeId, VerticalShmupThemeModule> = { classic: classicTheme };

export function resolveVerticalShmupTheme(_themeOrId?: Theme | string | null): VerticalShmupThemeModule {
  return THEMES.classic;
}

export { classicTheme, THEMES };
