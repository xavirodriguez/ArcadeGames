import type { OutrunVisualMod, OutrunVisualModId } from "./types";
import { classicMod } from "./classic/ClassicMod";

/**
 * Dynamic registry map for Outrun visual mods.
 */
const MOD_REGISTRY = new Map<string, OutrunVisualMod>([
  ["classic", classicMod]
]);

/**
 * Registers a new visual mod plugin or overrides an existing mod by ID.
 *
 * @public
 */
export function registerVisualMod(mod: OutrunVisualMod): void {
  MOD_REGISTRY.set(mod.id, mod);
}

/**
 * Resolves a visual mod id from config / gameOptions.
 * Unknown or missing values fall back to classic (zero visual change).
 *
 * @public
 */
export function resolveVisualMod(id: string | undefined | null): OutrunVisualMod {
  if (id && MOD_REGISTRY.has(id)) {
    return MOD_REGISTRY.get(id)!;
  }
  return MOD_REGISTRY.get("classic") ?? classicMod;
}

/**
 * Lists registered visual mods (for menus / debug).
 *
 * @public
 */
export function listVisualMods(): ReadonlyArray<{ id: OutrunVisualModId; displayName: string }> {
  return Array.from(MOD_REGISTRY.values()).map((m) => ({ id: m.id, displayName: m.displayName }));
}

export { MOD_REGISTRY as MODS };
