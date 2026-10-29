import type { SpaceInvadersMod, SpaceInvadersThemeModule, SpaceInvadersGameplayMod } from "./types";

/** Keep the historical flat SpaceInvadersMod shape while modules migrate independently. */
export function createSpaceInvadersModFacade(
  theme: SpaceInvadersThemeModule,
  gameplay: SpaceInvadersGameplayMod
): SpaceInvadersMod {
  return {
    id: theme.id,
    displayName: theme.displayName,
    ...(theme.createTheme ? { createTheme: theme.createTheme } : {}),
    ...(theme.registerDrawers ? { registerDrawers: theme.registerDrawers } : {}),
    ...(theme.registerBackgroundEffects ? { registerBackgroundEffects: theme.registerBackgroundEffects } : {}),
    ...(gameplay.registerSystems ? { registerSystems: gameplay.registerSystems } : {}),
    theme,
    gameplay
  };
}
