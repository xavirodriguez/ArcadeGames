import type { Theme } from "@tiny-aster/core";
import type { GeometryWarsThemeModule, GeometryWarsThemeId } from "./types";
import { neonTheme } from "./neon/NeonTheme";

const THEMES: Record<GeometryWarsThemeId, GeometryWarsThemeModule> = {
  neon: neonTheme
};

export function resolveGeometryWarsTheme(_themeOrId?: Theme | string | null): GeometryWarsThemeModule {
  return THEMES.neon;
}

export { neonTheme, THEMES };
