/**
 * PixelFX Integration Layer — Validation (V1)
 */

import { validateManifest, getAllManifestEntries } from "./PixelFXRegistry";

export function validatePixelFXLayer(): {
  ok: boolean;
  errors: string[];
  warnings: string[];
} {
  return validateManifest();
}

export function smokeTestManifest(): boolean {
  const result = validateManifest();
  if (!result.ok) {
    // eslint-disable-next-line no-console
    console.error("[PixelFX] manifest errors:", result.errors);
    return false;
  }
  if (result.warnings.length > 0) {
    // eslint-disable-next-line no-console
    console.warn("[PixelFX] manifest warnings:", result.warnings);
  }
  return true;
}

/** Ensure pilot games have at least one candidate entry */
export function assertPilotCoverage(
  games: Array<"asteroids" | "platformer" | "hitandrun"> = [
    "asteroids",
    "platformer",
    "hitandrun",
  ]
): string[] {
  const missing: string[] = [];
  const all = getAllManifestEntries();
  for (const g of games) {
    if (!all.some((e) => e.usedBy?.includes(g))) {
      missing.push(g);
    }
  }
  return missing;
}
