import type { ThemeModule } from "../presentation/types";
import type { AsteroidsGameplayMod } from "./gameplayTypes";
import type { AsteroidsVisualModFacade } from "./types";

/**
 * Compatibility adapter: legacy consumers see the old flat visual-mod API,
 * while new code can depend on the independent theme and gameplay modules.
 */
export function createAsteroidsVisualModFacade(
  theme: ThemeModule,
  gameplay: AsteroidsGameplayMod
): AsteroidsVisualModFacade {
  return {
    id: theme.id,
    displayName: theme.displayName,
    createTheme: theme.createTheme,
    registerDrawers: theme.registerDrawers,
    ...(theme.particleStyle !== undefined ? { particleStyle: theme.particleStyle } : {}),
    ...(theme.registerBackgroundEffects !== undefined
      ? { registerBackgroundEffects: theme.registerBackgroundEffects }
      : {}),
    ...(theme.registerHud !== undefined ? { registerHud: theme.registerHud } : {}),
    ...(gameplay.createAsteroidVerts !== undefined
      ? { createAsteroidVerts: gameplay.createAsteroidVerts }
      : {}),
    ...(gameplay.spawnDestructionEffect !== undefined
      ? { spawnDestructionEffect: gameplay.spawnDestructionEffect }
      : {}),
    theme,
    gameplay
  };
}
