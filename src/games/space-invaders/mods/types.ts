import type { Theme, ShapeDrawer, EffectDrawer, World } from "@tiny-aster/core";
import type { SpaceInvadersComponentRegistry } from "../types/SpaceInvadersTypes";
import type { ThemeModuleDescriptor, GameplayModDescriptor, AestheticBundle } from "../../shared/presentation/AestheticModules";

/** Stable IDs kept for config and concept-pack compatibility. */
export type SpaceInvadersModId = "classic" | "nautical";

/** Presentation contract: Theme, Canvas/Skia drawers and background effects only. */
export interface SpaceInvadersThemeModule extends ThemeModuleDescriptor {
  readonly id: SpaceInvadersModId;
  createTheme?: (baseTheme: Theme) => Theme;
  registerDrawers?: (
    register: (
      backend: "canvas" | "skia",
      shape: string,
      drawer: ShapeDrawer<unknown, SpaceInvadersComponentRegistry>
    ) => void
  ) => void;
  registerBackgroundEffects?: (
    register: (
      backend: "canvas" | "skia",
      name: string,
      effect: EffectDrawer<unknown, SpaceInvadersComponentRegistry> | ((ctx: unknown, ...args: unknown[]) => void)
    ) => void
  ) => void;
}

/** Runtime hooks required by a selected game configuration; no renderer imports. */
export interface SpaceInvadersGameplayMod extends GameplayModDescriptor {
  readonly id: SpaceInvadersModId;
  registerSystems?: (world: World<SpaceInvadersComponentRegistry>) => void;
}

/** Backwards-compatible combined contract consumed by older callers. */
export interface SpaceInvadersMod extends SpaceInvadersThemeModule, SpaceInvadersGameplayMod {
  readonly theme?: SpaceInvadersThemeModule;
  readonly gameplay?: SpaceInvadersGameplayMod;
}

export type SpaceInvadersAestheticBundle = AestheticBundle<SpaceInvadersThemeModule, SpaceInvadersGameplayMod>;
