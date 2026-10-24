import type { Theme, ShapeDrawer, EffectDrawer, World } from "@tiny-aster/core";
import type { SpaceInvadersComponentRegistry } from "../types/SpaceInvadersTypes";

/** Supported visual and gameplay mod identifiers for Space Invaders. */
export type SpaceInvadersModId = "classic" | "nautical";

/**
 * Contract for a Space Invaders game mod.
 *
 * Mods can extend themes, shape drawers, background effects, and simulation/presentation systems.
 *
 * @public
 */
export interface SpaceInvadersMod {
  /** Stable id used in config / concept pack resolution. */
  id: SpaceInvadersModId;

  /** Human-readable name for menus / debug. */
  displayName: string;

  /**
   * Builds or transforms the Theme applied to the world for this mod.
   */
  createTheme?: (baseTheme: Theme) => Theme;

  /**
   * Registers custom shape drawers for Canvas and Skia backends.
   */
  registerDrawers?: (
    register: (
      backend: "canvas" | "skia",
      shape: string,
      drawer: ShapeDrawer<unknown, SpaceInvadersComponentRegistry>
    ) => void
  ) => void;

  /**
   * Registers background effects (e.g., parchment chart, HUD overlay) for Canvas and Skia.
   */
  registerBackgroundEffects?: (
    register: (
      backend: "canvas" | "skia",
      name: string,
      effect: EffectDrawer<unknown, SpaceInvadersComponentRegistry> | ((ctx: unknown, ...args: unknown[]) => void)
    ) => void
  ) => void;

  /**
   * Registers simulation/presentation systems required by this mod into the World.
   */
  registerSystems?: (world: World<SpaceInvadersComponentRegistry>) => void;
}
