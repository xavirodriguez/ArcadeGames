import type { Theme, World } from "@tiny-aster/core";
import type { AsteroidsComponentRegistry, AsteroidsEventRegistry } from "../types/AsteroidRegistry";
import type { AsteroidConfig } from "../types/AsteroidConfigSchema";
import type { AsteroidsVisualMod } from "./types";
import { resolveVisualMod } from "./registry";
import { createThemeFromGameAccents } from "../../../theme/gameAccents";

export type VisualModGameOptions = {
  mod?: string;
  [key: string]: unknown;
};

/**
 * Resolves the active visual mod and applies its theme to the world.
 * Call from AsteroidsGame.onRegisterSystems after config is loaded.
 *
 * Priority: gameOptions.mod > config.VISUAL_MOD > "classic"
 *
 * @public
 */
export function applyVisualMod(
  world: World<AsteroidsComponentRegistry, AsteroidsEventRegistry>,
  config: AsteroidConfig,
  gameOptions: VisualModGameOptions | undefined,
  currentTheme: Theme | undefined
): AsteroidsVisualMod {
  const modId = gameOptions?.mod ?? config.VISUAL_MOD ?? "classic";
  const visualMod = resolveVisualMod(modId);
  world.setResource("VisualMod", visualMod);

  const baseTheme = currentTheme ?? createThemeFromGameAccents("asteroids");
  const themed = visualMod.createTheme(baseTheme);
  world.setResource("Theme", themed);

  return visualMod;
}
