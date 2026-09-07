import { World } from "@tiny-aster/core";
import { GameStateComponent } from "../types/SpaceInvadersTypes";

/**
 * Checks whether the current game frame is in a paused, game over, ready, or intermission state.
 *
 * @param world - The current ECS World instance.
 * @param gameState - The GameStateComponent singleton or null/undefined.
 * @returns `true` if the game is paused, in game over, ready, or intermission state.
 */
export function isIntermissionOrPaused(
  world: World<any>,
  gameState?: GameStateComponent | null
): boolean {
  if (world.getResource("IsPaused") === true) return true;
  if (gameState) {
    if (gameState.isGameOver) return true;
    if (
      (gameState.readyRemaining ?? 0) > 0 ||
      (gameState.intermissionRemaining ?? 0) > 0 ||
      (gameState.continueCountdownRemaining ?? 0) > 0
    ) {
      return true;
    }
  }
  return false;
}
