import { classicTheme } from "../mods/classic/ClassicTheme";
import { icebergTheme } from "../mods/iceberg/IcebergTheme";
import type { ThemeModule } from "./types";

/** Built-in Asteroids themes retain their historical IDs. */
const THEME_MODULES = new Map<string, ThemeModule>([
  ["classic", classicTheme],
  ["iceberg", icebergTheme]
]);

/** Register or replace a presentation-only module for Asteroids. */
export function registerAsteroidsTheme(theme: ThemeModule): void {
  THEME_MODULES.set(theme.id, theme);
}

/** Unknown theme IDs safely fall back to the historical classic presentation. */
export function resolveAsteroidsTheme(id?: string | null): ThemeModule {
  return (id ? THEME_MODULES.get(id) : undefined) ?? THEME_MODULES.get("classic") ?? classicTheme;
}

/** Metadata for menus and diagnostics; modules themselves remain encapsulated. */
export function listAsteroidsThemes(): ReadonlyArray<{ readonly id: string; readonly displayName: string }> {
  return Array.from(THEME_MODULES.values(), ({ id, displayName }) => ({ id, displayName }));
}

/** URL-facing selector is limited to the two themes exposed by the Asteroids start screen. */
export function resolveAsteroidsThemeId(requestedId?: string | null): "classic" | "iceberg" {
  return requestedId === "iceberg" ? "iceberg" : "classic";
}
