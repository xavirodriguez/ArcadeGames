import type { Theme, World } from "@tiny-aster/core";
import type { OutrunComponentRegistry, OutrunEventRegistry } from "../types/OutrunTypes";
import type { OutrunConfig } from "../types/OutrunConfigSchema";
import type { OutrunVisualMod } from "./types";
import { resolveVisualMod } from "./registry";
import { createThemeFromGameAccents } from "../../../theme/gameAccents";

export type VisualModGameOptions = {
  mod?: string;
  visualMod?: string;
  [key: string]: unknown;
};

/**
 * Resolves the active visual mod and applies its theme to the world.
 * Call from OutrunGame.onRegisterSystems after config is loaded.
 *
 * Priority: gameOptions.mod > gameOptions.visualMod > config.VISUAL_MOD > "classic"
 *
 * @public
 */
export function applyVisualMod(
  world: World<OutrunComponentRegistry, OutrunEventRegistry>,
  config: OutrunConfig,
  gameOptions: VisualModGameOptions | undefined,
  currentTheme: Theme | undefined
): OutrunVisualMod {
  const modId =
    gameOptions?.mod ??
    gameOptions?.visualMod ??
    (config as Record<string, unknown> | undefined)?.VISUAL_MOD as string | undefined ??
    "classic";

  const visualMod = resolveVisualMod(modId);
  const themeModule = visualMod.theme ?? visualMod;
  const gameplayMod = visualMod.gameplay ?? visualMod;
  world.setResource("VisualMod", visualMod);
  world.setResource("OutrunThemeModule", themeModule);
  world.setResource("GameplayMod", gameplayMod);

  const baseTheme = currentTheme ?? createThemeFromGameAccents("racing");
  const themed = themeModule.createTheme(baseTheme);
  world.setResource("Theme", themed);

  return visualMod;
}
