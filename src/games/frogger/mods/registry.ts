import type { Theme } from "@tiny-aster/core";
import type { FroggerThemeModule, FroggerThemeId } from "./types";
import { classicTheme } from "./classic/ClassicTheme";

const THEMES: Record<FroggerThemeId, FroggerThemeModule> = {
  classic: classicTheme
};

function resolveId(_themeOrId?: Theme | string | null): FroggerThemeId {
  return "classic";
}

/** Authoritative presentation registry for Frogger. */
export function resolveFroggerTheme(themeOrId?: Theme | string | null): FroggerThemeModule {
  return THEMES[resolveId(themeOrId)];
}

export { classicTheme, THEMES };
