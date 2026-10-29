import type { Theme } from "@tiny-aster/core";
import type { PongThemeModule, PongThemeId } from "./types";
import { classicTheme } from "./classic/ClassicTheme";

const THEMES: Record<PongThemeId, PongThemeModule> = { classic: classicTheme };

export function resolvePongTheme(_themeOrId?: Theme | string | null): PongThemeModule {
  return THEMES.classic;
}

export { classicTheme, THEMES };
