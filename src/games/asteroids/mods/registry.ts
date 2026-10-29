import type { AsteroidsVisualMod, AsteroidsVisualModFacade, AsteroidsVisualModId } from "./types";
import { createAsteroidsVisualModFacade } from "./createVisualModFacade";
import { registerAsteroidsTheme } from "../presentation/themeRegistry";
import { registerAsteroidsGameplayMod } from "./gameplayRegistry";
import { classicMod } from "./classic/ClassicMod";
import { icebergMod } from "./iceberg/IcebergMod";

/** Compatibility registry for existing callers that expect one visual-mod object. */
const MOD_REGISTRY = new Map<string, AsteroidsVisualMod>([
  ["classic", classicMod],
  ["iceberg", icebergMod]
]);

/**
 * Register a split facade or a legacy combined plug-in. Legacy plug-ins are
 * normalized into independent registry entries while the flat API remains available.
 */
export function registerVisualMod(mod: AsteroidsVisualMod): void {
  const theme = mod.theme ?? mod;
  const gameplay = mod.gameplay ?? mod;
  const facade: AsteroidsVisualModFacade =
    mod.theme && mod.gameplay
      ? mod as AsteroidsVisualModFacade
      : createAsteroidsVisualModFacade(theme, gameplay);

  registerAsteroidsTheme(theme);
  registerAsteroidsGameplayMod(gameplay);
  MOD_REGISTRY.set(facade.id, facade);
}

/** Unknown or missing IDs retain the old safe fallback to Classic. */
export function resolveVisualMod(id: string | undefined | null): AsteroidsVisualMod {
  return (id ? MOD_REGISTRY.get(id) : undefined) ?? MOD_REGISTRY.get("classic") ?? classicMod;
}

export function listVisualMods(): ReadonlyArray<{ id: AsteroidsVisualModId; displayName: string }> {
  return Array.from(MOD_REGISTRY.values(), ({ id, displayName }) => ({ id, displayName }));
}

registerVisualMod(classicMod);
registerVisualMod(icebergMod);

export { MOD_REGISTRY as MODS };
