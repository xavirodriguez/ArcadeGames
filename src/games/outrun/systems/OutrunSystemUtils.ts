import { World } from "@tiny-aster/core";
import type { OutrunConfig } from "../types/OutrunConfigSchema";
import { DEFAULT_OUTRUN_CONFIG } from "../types/OutrunConfigSchema";
import type { OutrunComponentRegistry, OutrunEventRegistry, RaceStateComponent } from "../types/OutrunTypes";

export interface OutrunSystemContext {
  state: RaceStateComponent;
  config: OutrunConfig;
}

/**
 * Resolves shared system context for Outrun systems.
 * Returns undefined if paused, if RaceState is missing, or if game is over.
 * @public
 */
export function resolveOutrunSystemContext(
  world: World<OutrunComponentRegistry, OutrunEventRegistry>
): OutrunSystemContext | undefined {
  if (world.getResource("IsPaused") === true) return undefined;

  const state = world.getSingleton("RaceState");
  if (!state || state.isGameOver) return undefined;

  const config =
    world.getResource<OutrunConfig>("GameConfig") ?? DEFAULT_OUTRUN_CONFIG;

  return { state, config };
}

/**
 * Resolves Outrun system context and returns config, or undefined if invalid context.
 * @public
 */
export function resolveOutrunSystemConfig(
  world: World<OutrunComponentRegistry, OutrunEventRegistry>
): OutrunConfig | undefined {
  const ctx = resolveOutrunSystemContext(world);
  return ctx?.config;
}
