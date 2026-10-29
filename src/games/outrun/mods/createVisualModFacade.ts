import type { OutrunGameplayMod, OutrunThemeModule, OutrunVisualMod } from "./types";

/** Compatibility adapter exposing the historical flat OutrunVisualMod API. */
export function createOutrunVisualModFacade(
  theme: OutrunThemeModule,
  gameplay: OutrunGameplayMod
): OutrunVisualMod {
  return {
    ...theme,
    id: theme.id,
    displayName: theme.displayName,
    theme,
    gameplay
  };
}
