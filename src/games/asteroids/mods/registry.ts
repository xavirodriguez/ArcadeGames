import type { AsteroidsVisualMod, AsteroidsVisualModId } from "./types";
import { classicMod } from "./classic/ClassicMod";
import { icebergMod } from "./iceberg/IcebergMod";

const MODS: Record<AsteroidsVisualModId, AsteroidsVisualMod> = {
  classic: classicMod,
  iceberg: icebergMod
};

/**
 * Resolves a visual mod id from config / gameOptions.
 * Unknown or missing values fall back to classic (zero visual change).
 *
 * @public
 */
export function resolveVisualMod(id: string | undefined | null): AsteroidsVisualMod {
  if (id === "iceberg") return MODS.iceberg;
  return MODS.classic;
}

/**
 * Lists registered visual mods (for menus / debug).
 *
 * @public
 */
export function listVisualMods(): ReadonlyArray<{ id: AsteroidsVisualModId; displayName: string }> {
  return Object.values(MODS).map((m) => ({ id: m.id, displayName: m.displayName }));
}

export { MODS };
