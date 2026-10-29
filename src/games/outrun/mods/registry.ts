import type { OutrunVisualMod, OutrunVisualModId, OutrunThemeModule, OutrunGameplayMod } from "./types";
import { classicMod } from "./classic/ClassicMod";
import { createOutrunVisualModFacade } from "./createVisualModFacade";

/** One canonical registry stores each aesthetic bundle and serves legacy callers. */
const MOD_REGISTRY = new Map<string, OutrunVisualMod>([
  ["classic", classicMod]
]);

/** Register a paired bundle or normalize a legacy flat visual mod. */
export function registerVisualMod(mod: OutrunVisualMod): void {
  const theme = mod.theme ?? mod;
  const gameplay = mod.gameplay ?? mod;
  const bundle = mod.theme && mod.gameplay
    ? mod
    : createOutrunVisualModFacade(theme, gameplay);
  MOD_REGISTRY.set(bundle.id, bundle);
}

/** Unknown or missing IDs retain the historical Classic fallback. */
export function resolveVisualMod(id: string | undefined | null): OutrunVisualMod {
  return (id ? MOD_REGISTRY.get(id) : undefined) ?? MOD_REGISTRY.get("classic") ?? classicMod;
}

/** Compatibility selectors derive from the single bundle registry; no duplicate registration maps. */
export function resolveOutrunTheme(id?: string | null): OutrunThemeModule {
  const bundle = resolveVisualMod(id);
  return bundle.theme ?? bundle;
}

export function resolveOutrunGameplayMod(id?: string | null): OutrunGameplayMod {
  const bundle = resolveVisualMod(id);
  return bundle.gameplay ?? bundle;
}

export function listVisualMods(): ReadonlyArray<{ id: OutrunVisualModId; displayName: string }> {
  return Array.from(MOD_REGISTRY.values(), ({ id, displayName }) => ({ id, displayName }));
}

export { MOD_REGISTRY as MODS };
