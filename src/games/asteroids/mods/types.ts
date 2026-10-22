import type { Theme, ShapeDrawer } from "@tiny-aster/core";
import type { AsteroidsComponentRegistry } from "../types/AsteroidRegistry";

/** Supported visual mod identifiers for Asteroids. */
export type AsteroidsVisualModId = "classic" | "iceberg";

/** Particle style hint used by presentation systems. */
export type AsteroidsParticleStyle = "neon" | "iceShard" | "crystalFacet";

/**
 * Contract for an Asteroids visual mod (presentation only).
 *
 * Mods must not alter gameplay systems, collision, scoring, or determinism.
 * Geometry generators that need randomness must use the provided `random`
 * callback (typically `world.gameplayRandom.next`).
 *
 * @public
 */
export interface AsteroidsVisualMod {
  /** Stable id used in config and gameOptions. */
  id: AsteroidsVisualModId;

  /** Human-readable name for menus / debug. */
  displayName: string;

  /**
   * Builds the Theme applied to the world for this mod.
   * Receives the base theme from `createThemeFromGameAccents("asteroids")`.
   */
  createTheme: (baseTheme: Theme) => Theme;

  /**
   * Registers shape drawers for both Canvas and Skia backends.
   * Call `register("canvas" | "skia", shapeId, drawer)` for each shape.
   */
  registerDrawers: (
    register: (
      backend: "canvas" | "skia",
      shape: string,
      drawer: ShapeDrawer<unknown, AsteroidsComponentRegistry>
    ) => void
  ) => void;

  /**
   * Optional background effects (ocean strata, geometric aurora, etc.).
   */
  registerBackgroundEffects?: (
    register: (
      backend: "canvas" | "skia",
      name: string,
      effect: (ctx: unknown, width: number, height: number, ...args: unknown[]) => void
    ) => void
  ) => void;

  /**
   * Optional deterministic vertex generator for asteroid / iceberg shapes.
   * When provided, entity factories may use it instead of default jagged rocks.
   */
  createAsteroidVerts?: (
    size: "large" | "medium" | "small",
    radius: number,
    random: () => number
  ) => Array<{ x: number; y: number }>;

  /** Preferred particle style for destruction / thrust FX. */
  particleStyle?: AsteroidsParticleStyle;
}
