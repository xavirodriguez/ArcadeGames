import { World } from "@tiny-aster/core";

/**
 * Interface representing the configuration options for combo calculation.
 * @public
 */
export interface ComboConfig {
  COMBO_TIMEOUT?: number;
  MAX_MULTIPLIER?: number;
  [key: string]: unknown;
}

/**
 * Result returned by `applyComboKill`.
 * @public
 */
export interface ComboKillResult {
  nextCombo: number;
  nextMultiplier: number;
}

/**
 * Increments combo, resets timer, and calculates new multiplier for a kill event.
 * Reusable helper across arcade games (Space Invaders, Asteroids, etc.).
 *
 * @param world - ECS World instance
 * @param comboEntity - Entity ID containing the `Combo` component
 * @param config - Game configuration containing `COMBO_TIMEOUT` and `MAX_MULTIPLIER`
 * @returns Object with updated `nextCombo` and `nextMultiplier`
 * @public
 */
export function applyComboKill<TRegistry extends Record<string, any>>(
  world: World<TRegistry>,
  comboEntity: number,
  config: ComboConfig
): ComboKillResult {
  let nextCombo = 1;
  let nextMultiplier = 1;

  world.mutateComponent(comboEntity, "Combo" as Extract<keyof TRegistry, string>, (c: any) => {
    c.combo = (c.combo || 0) + 1;
    c.timerRemaining = (config.COMBO_TIMEOUT ?? 2000) / 1000;
    c.multiplier = Math.min(config.MAX_MULTIPLIER ?? 5, 1 + Math.floor(c.combo / 5));
    nextCombo = c.combo;
    nextMultiplier = c.multiplier;
  });

  return { nextCombo, nextMultiplier };
}
