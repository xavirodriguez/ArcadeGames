import type { ThemeModule, AsteroidsParticleStyle } from "../presentation/types";
import type { AsteroidsGameplayMod } from "./gameplayTypes";

/** Supported visual mod identifiers for Asteroids. */
export type AsteroidsVisualModId = string;

/** Backwards-compatible combined contract. Prefer ThemeModule or AsteroidsGameplayMod. */
export interface AsteroidsVisualMod extends ThemeModule, AsteroidsGameplayMod {
  /** New split modules; optional for legacy plug-ins registered through registerVisualMod. */
  readonly theme?: ThemeModule;
  readonly gameplay?: AsteroidsGameplayMod;
}

/** Fully split facade returned by the built-in modules and registry. */
export interface AsteroidsVisualModFacade extends AsteroidsVisualMod {
  readonly theme: ThemeModule;
  readonly gameplay: AsteroidsGameplayMod;
}

export type { AsteroidsParticleStyle, ThemeModule, AsteroidsGameplayMod };
