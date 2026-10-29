import type { Theme, ShapeDrawer, World, EffectDrawer } from "@tiny-aster/core";
import type { OutrunComponentRegistry, OutrunEventRegistry, RoadSegmentSprite } from "../types/OutrunTypes";
import type { OutrunConfig } from "../types/OutrunConfigSchema";
import type { OutrunVisualPaletteResource } from "../types/OutrunVisualTypes";
import type { ThemeModuleDescriptor, GameplayModDescriptor, AestheticBundle } from "../../shared/presentation/AestheticModules";

/** Supported visual mod identifiers for Outrun. */
export type OutrunVisualModId = string;

/**
 * Descriptor for a bitmap sprite asset mapping.
 * Extension point for mods that use bitmap sprite assets instead of procedural vector geometry.
 */
export interface OutrunBitmapSpriteSpec {
  assetKey: string;
  srcRect?: { x: number; y: number; w: number; h: number };
  anchor?: { x: number; y: number };
  aspectRatio?: number;
}

/**
 * Parameters passed to roadside decoration drawers.
 */
export interface OutrunRoadsideDrawParams {
  backend: "canvas" | "skia";
  /** CanvasRenderingContext2D (canvas) or SkCanvas (skia). */
  ctx: unknown;
  sprite: RoadSegmentSprite;
  sx: number;
  sy: number;
  sw: number;
  clipY: number;
  visualPalette: OutrunVisualPaletteResource;
  depth: number;
  lightsOn: boolean;
  world?: World<OutrunComponentRegistry, OutrunEventRegistry>;
}

/**
 * Parameters passed to traffic vehicle drawers.
 */
export interface OutrunTrafficDrawParams {
  backend: "canvas" | "skia";
  ctx: unknown;
  config: OutrunConfig;
  centerX: number;
  baselineY: number;
  width: number;
  styleIndex: number;
  world?: World<OutrunComponentRegistry, OutrunEventRegistry>;
}

/**
 * Contract for an Outrun visual mod (presentation only).
 *
 * Mods must not alter gameplay physics, road geometry, speed calculations, or determinism.
 *
 * @public
 */
export interface OutrunThemeModule extends ThemeModuleDescriptor {
  /** Stable id used in config and gameOptions. */
  id: OutrunVisualModId;

  /** Human-readable name for menus / debug. */
  displayName: string;

  /**
   * Builds the Theme applied to the world for this mod.
   * Receives base theme from `createThemeFromGameAccents("racing")`.
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
      drawer: ShapeDrawer<unknown, OutrunComponentRegistry>
    ) => void
  ) => void;

  /**
   * Optional background effects (HUD, sky overlays, weather, etc.).
   */
  registerBackgroundEffects?: (
    register: (
      backend: "canvas" | "skia",
      name: string,
      effect: EffectDrawer<unknown, OutrunComponentRegistry> | ((ctx: unknown, ...args: unknown[]) => void)
    ) => void
  ) => void;

  /**
   * Resolves the roadside decor kind string for a track segment slot.
   * Called during deterministic road generation.
   *
   * @param scenarioId The current segment scenario theme (e.g. "coast", "desert", "mountain").
   * @param slotHash Deterministic random float (0..1) for this decoration slot.
   */
  resolveScenarioDecorKind: (scenarioId: string, slotHash: number) => string;

  /**
   * Resolves an incoming roadside sprite kind to a target roadside artwork kind.
   * Prevents unknown kinds from collapsing silently if the mod handles them.
   */
  resolveRoadsideKind?: (kind: string) => string;

  /**
   * Resolves a traffic vehicle shape/kind identifier for a given vehicle style index.
   * Allows mods to introduce custom traffic vehicle kinds (e.g. "horse-cart", "carriage").
   */
  resolveTrafficVehicleShape?: (styleIndex: number) => string;

  /**
   * Optional custom drawer for roadside decoration elements (trees, rocks, signs, fences, etc.).
   * Returning true indicates the sprite was handled by the mod.
   */
  drawRoadsideSprite?: (params: OutrunRoadsideDrawParams) => boolean;

  /**
   * Optional custom drawer for rival / traffic vehicles.
   * Returning true indicates the vehicle was handled by the mod.
   */
  drawTrafficVehicle?: (params: OutrunTrafficDrawParams) => boolean;

  /**
   * Optional bitmap sprite catalog mapping decor or vehicle kinds to bitmap sprite specs.
   * Extension point for mods that use bitmap assets with CanvasSpriteDrawer/SkiaSpriteDrawer.
   */
  spriteCatalog?: Record<string, OutrunBitmapSpriteSpec>;
}


/** Gameplay extension point; Classic currently uses only the base driving systems. */
export interface OutrunGameplayMod extends GameplayModDescriptor {
  readonly id: OutrunVisualModId;
}

/** Legacy combined contract, retained for current mod consumers. */
export interface OutrunVisualMod extends OutrunThemeModule, OutrunGameplayMod {
  readonly theme?: OutrunThemeModule;
  readonly gameplay?: OutrunGameplayMod;
}

export type OutrunAestheticBundle = AestheticBundle<OutrunThemeModule, OutrunGameplayMod>;
