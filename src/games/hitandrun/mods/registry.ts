import type { HitAndRunThemeModule, HitAndRunThemeId } from "./types";
import { fantasyThemeModule } from "./fantasy/FantasyThemeModule";
import { sumiEThemeModule } from "./sumi-e/SumiEThemeModule";
import { resolveThemeIdFromConfig } from "../rendering/theme/ThemeRegistry";

const THEMES: Record<HitAndRunThemeId, HitAndRunThemeModule> = {
  fantasy: fantasyThemeModule,
  "sumi-e": sumiEThemeModule
};

function asThemeId(raw: string | undefined | null): HitAndRunThemeId {
  if (raw === "sumi-e") return "sumi-e";
  return "fantasy";
}

/** Pure resolver: selecting metadata does not mutate the currently active theme. */
export function resolveHitAndRunTheme(themeOrId?: string | null): HitAndRunThemeModule {
  const raw = themeOrId ?? resolveThemeIdFromConfig(undefined);
  return THEMES[asThemeId(raw)];
}

/**
 * @deprecated Compatibility alias. Production code should resolve the theme and
 * create a session owned by the corresponding game instance.
 */
export function activateHitAndRunTheme(themeOrId?: string | null): HitAndRunThemeModule {
  return resolveHitAndRunTheme(themeOrId);
}

export { fantasyThemeModule, sumiEThemeModule, THEMES };
