import type { Theme } from "@tiny-aster/core";
import type { HitAndRunThemeModule, HitAndRunThemeId } from "./types";
import { fantasyThemeModule } from "./fantasy/FantasyThemeModule";
import { sumiEThemeModule } from "./sumi-e/SumiEThemeModule";
import { ThemeRegistry, resolveThemeIdFromConfig } from "../rendering/theme/ThemeRegistry";

const THEMES: Record<HitAndRunThemeId, HitAndRunThemeModule> = {
  fantasy: fantasyThemeModule,
  "sumi-e": sumiEThemeModule
};

function asThemeId(raw: string | undefined | null): HitAndRunThemeId {
  if (raw === "sumi-e") return "sumi-e";
  return "fantasy";
}

/**
 * Authoritative presentation facade. Activates ThemeRegistry when resolving
 * so drawers continue to use getActiveTheme().
 */
export function resolveHitAndRunTheme(themeOrId?: Theme | string | null): HitAndRunThemeModule {
  const raw =
    typeof themeOrId === "string"
      ? themeOrId
      : resolveThemeIdFromConfig(undefined);
  const id = asThemeId(raw);
  ThemeRegistry.setActiveTheme(id);
  return THEMES[id];
}

export { fantasyThemeModule, sumiEThemeModule, THEMES };
