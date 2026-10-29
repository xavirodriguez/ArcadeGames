import type { Theme, World } from "@tiny-aster/core";
import type { AsteroidsComponentRegistry, AsteroidsEventRegistry } from "../types/AsteroidRegistry";
import type { AsteroidConfig } from "../types/AsteroidConfigSchema";
import type { AsteroidsVisualMod } from "./types";
import { resolveVisualMod } from "./registry";
import { resolveAsteroidsTheme } from "../presentation/themeRegistry";
import { resolveAsteroidsGameplayMod } from "./gameplayRegistry";
import { createThemeFromGameAccents } from "../../../theme/gameAccents";

export type VisualModGameOptions = {
  mod?: string;
  [key: string]: unknown;
};

/**
 * Resolves the selected compatibility facade and writes its independent modules
 * into their own world resources. Theme construction remains a pure function.
 *
 * Priority: gameOptions.mod > config.VISUAL_MOD > "classic"
 */
export function applyVisualMod(
  world: World<AsteroidsComponentRegistry, AsteroidsEventRegistry>,
  config: AsteroidConfig,
  gameOptions: VisualModGameOptions | undefined,
  currentTheme: Theme | undefined
): AsteroidsVisualMod {
  const modId = gameOptions?.mod ?? config.VISUAL_MOD ?? "classic";
  const visualMod = resolveVisualMod(modId);
  const themeModule = resolveAsteroidsTheme(modId);
  const gameplayMod = resolveAsteroidsGameplayMod(modId);
  const baseTheme = currentTheme ?? createThemeFromGameAccents("asteroids");
  const themed = themeModule.createTheme(baseTheme);

  world.setResource("AsteroidsThemeModule", themeModule);
  world.setResource("GameplayMod", gameplayMod);
  world.setResource("VisualMod", visualMod);
  world.setResource("Theme", themed);

  return visualMod;
}
