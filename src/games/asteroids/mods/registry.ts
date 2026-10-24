import type { AsteroidsVisualMod, AsteroidsVisualModId } from "./types";
import { classicMod } from "./classic/ClassicMod";
import { icebergMod } from "./iceberg/IcebergMod";

/**
 * Dynamic registry map for visual mods.
 *
 * Note on Trade-off: Moving from a closed union type Record<AsteroidsVisualModId, AsteroidsVisualMod>
 * to a string-keyed Map removes compile-time exhaustiveness guarantees that all union IDs are registered.
 * This trade-off enables dynamic plugin registration via `registerVisualMod`.
 * Runtime tests in `VisualModRegistry.test.ts` compensate by verifying default mod availability.
 */
const MOD_REGISTRY = new Map<string, AsteroidsVisualMod>([
  ["classic", classicMod],
  ["iceberg", icebergMod]
]);

/**
 * Registers a new visual mod plugin or overrides an existing mod by ID.
 *
 * @public
 */
export function registerVisualMod(mod: AsteroidsVisualMod): void {
  MOD_REGISTRY.set(mod.id, mod);
}

/**
 * Resolves a visual mod id from config / gameOptions.
 * Unknown or missing values fall back to classic (zero visual change).
 *
 * @public
 */
export function resolveVisualMod(id: string | undefined | null): AsteroidsVisualMod {
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
export function listVisualMods(): ReadonlyArray<{ id: AsteroidsVisualModId; displayName: string }> {
  return Array.from(MOD_REGISTRY.values()).map((m) => ({ id: m.id, displayName: m.displayName }));
}

export { MOD_REGISTRY as MODS };
