import type { EffectDrawer, ShapeDrawer, Theme } from "@tiny-aster/core";
import type { AsteroidsComponentRegistry } from "../types/AsteroidRegistry";
import type { ThemeModuleDescriptor } from "../../shared/presentation/AestheticModules";

/** Particle rendering hint: presentation-only, never a gameplay rule. */
export type AsteroidsParticleStyle = "neon" | "iceShard" | "crystalFacet";

/**
 * A game-local ThemeModule contract for Asteroids presentation.
 * It owns palette/theme construction and Canvas/Skia renderer registrations only.
 * Gameplay mutation hooks intentionally live in AsteroidsGameplayMod.
 */
export interface ThemeModule extends ThemeModuleDescriptor {
  readonly particleStyle?: AsteroidsParticleStyle;
  createTheme: (baseTheme: Theme) => Theme;
  registerDrawers: (
    register: (
      backend: "canvas" | "skia",
      shape: string,
      drawer: ShapeDrawer<unknown, AsteroidsComponentRegistry>
    ) => void
  ) => void;
  registerBackgroundEffects?: (
    register: (
      backend: "canvas" | "skia",
      name: string,
      effect: (ctx: unknown, width: number, height: number, ...args: unknown[]) => void
    ) => void
  ) => void;
  registerHud?: (
    register: (
      backend: "canvas" | "skia",
      name: string,
      effect: EffectDrawer<unknown, AsteroidsComponentRegistry>
    ) => void
  ) => void;
}
