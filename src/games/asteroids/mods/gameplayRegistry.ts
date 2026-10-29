import { classicGameplayMod } from "./classic/ClassicGameplayMod";
import { icebergGameplayMod } from "./iceberg/IcebergGameplayMod";
import type { AsteroidsGameplayMod } from "./gameplayTypes";

const GAMEPLAY_MODS = new Map<string, AsteroidsGameplayMod>([
  ["classic", classicGameplayMod],
  ["iceberg", icebergGameplayMod]
]);

/** Register gameplay behavior independently of any renderer. */
export function registerAsteroidsGameplayMod(mod: AsteroidsGameplayMod): void {
  GAMEPLAY_MODS.set(mod.id, mod);
}

/** Unknown IDs fall back to Classic's unchanged gameplay behavior. */
export function resolveAsteroidsGameplayMod(id?: string | null): AsteroidsGameplayMod {
  return (id ? GAMEPLAY_MODS.get(id) : undefined) ?? GAMEPLAY_MODS.get("classic") ?? classicGameplayMod;
}

export function listAsteroidsGameplayMods(): ReadonlyArray<{ readonly id: string }> {
  return Array.from(GAMEPLAY_MODS.values(), ({ id }) => ({ id }));
}
