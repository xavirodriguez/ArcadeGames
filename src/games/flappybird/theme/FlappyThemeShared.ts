import { Theme, World, THEME_RESOURCE_KEY } from "@tiny-aster/core";

export const OFFICE_PAPER_THEME_ID = "office-paper";

/**
 * Evaluates whether a Theme instance corresponds to the "office-paper" concept pack.
 */
export function isOfficeTheme(theme: Theme | undefined | null): boolean {
  return theme?.conceptPack?.id === OFFICE_PAPER_THEME_ID;
}

/**
 * Evaluates whether the active world theme corresponds to the "office-paper" concept pack.
 */
export function isOfficeThemeWorld(world: World): boolean {
  const theme = world.getResource<Theme>(THEME_RESOURCE_KEY);
  return isOfficeTheme(theme);
}
