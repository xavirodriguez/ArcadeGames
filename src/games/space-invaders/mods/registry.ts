import type { Theme } from "@tiny-aster/core";
import type { SpaceInvadersMod, SpaceInvadersModId } from "./types";
import { classicMod } from "./classic/ClassicMod";
import { nauticalMod } from "./nautical/NauticalMod";

const NAUTICAL_THEME_IDS = new Set(["aqui_hay_dragones", "nautical-chart"]);

const MODS: Record<SpaceInvadersModId, SpaceInvadersMod> = {
  classic: classicMod,
  nautical: nauticalMod
};

/**
 * Resolves active Space Invaders mod from theme or explicitly requested mod id.
 */
export function resolveSpaceInvadersMod(themeOrId?: Theme | string | null): SpaceInvadersMod {
  if (!themeOrId) return MODS.classic;

  if (typeof themeOrId === "string") {
    if (themeOrId === "nautical" || NAUTICAL_THEME_IDS.has(themeOrId)) return MODS.nautical;
    return MODS.classic;
  }

  const conceptId = themeOrId.conceptPack?.id;
  if (typeof conceptId === "string" && NAUTICAL_THEME_IDS.has(conceptId)) {
    return MODS.nautical;
  }

  return MODS.classic;
}

export { MODS, classicMod, nauticalMod };
