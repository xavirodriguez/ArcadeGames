import type { Theme } from "@tiny-aster/core";
import type { EchoRunnerThemeModule, EchoRunnerThemeId } from "./types";
import { classicTheme } from "./classic/ClassicTheme";

const THEMES: Record<EchoRunnerThemeId, EchoRunnerThemeModule> = { classic: classicTheme };

export function resolveEchoRunnerTheme(_themeOrId?: Theme | string | null): EchoRunnerThemeModule {
  return THEMES.classic;
}

export { classicTheme, THEMES };
