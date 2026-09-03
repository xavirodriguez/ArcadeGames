import { MiniGameRunContext } from "@tiny-aster/core";

/**
 * Applies standard narrative encounter modifiers (`shieldMultiplier`, `navigationAssist`)
 * to a minigame instance.
 *
 * @public
 */
export function applyStandardEncounterModifiers(
  game: unknown,
  context: MiniGameRunContext
): void {
  const targetGame = game as Record<string, unknown>;
  for (const modifier of context.modifiers) {
    if (modifier.targetProperty === "shieldMultiplier" && typeof modifier.value === "number") {
      targetGame.shieldMultiplier = modifier.value;
    } else if (modifier.targetProperty === "navigationAssist" && typeof modifier.value === "boolean") {
      targetGame.navigationAssist = modifier.value;
    }
  }
}
