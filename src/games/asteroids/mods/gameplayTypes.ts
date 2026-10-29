import type { World } from "@tiny-aster/core";
import type { AsteroidsComponentRegistry, AsteroidsEventRegistry } from "../types/AsteroidRegistry";

/** Gameplay hooks that must not depend on renderer or theme modules. */
export interface AsteroidsGameplayMod {
  readonly id: string;
  /**
   * Optional deterministic asteroid geometry supplied by the selected game mode.
   * The random callback must be injected by its caller.
   */
  createAsteroidVerts?: (
    size: "large" | "medium" | "small",
    radius: number,
    random: () => number
  ) => Array<{ x: number; y: number }>;
  /** Gameplay-facing dispatch for deterministic destruction feedback. */
  spawnDestructionEffect?: (
    world: World<AsteroidsComponentRegistry, AsteroidsEventRegistry>,
    x: number,
    y: number,
    size: "large" | "medium" | "small" | "ship"
  ) => void;
}
