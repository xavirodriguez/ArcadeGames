import type { SpaceInvadersThemeModule } from "../types";
import { registerNauticalChartCanvasEffects, registerNauticalChartSkiaEffects } from "./rendering/registerNauticalChartEffects";
import { drawSeaDragonSpriteCanvas, drawSkiaSeaDragonSprite, SEA_DRAGON_SHAPE } from "../../rendering/SeaDragonVisuals";
import {
  drawGhostGalleonSpriteCanvas,
  drawSkiaGhostGalleonSprite,
  GHOST_GALLEON_SHAPE
} from "../../rendering/GhostGalleonVisuals";

/** Aquí hay dragones presentation module: parchment chart, nautical HUD and sprite drawers. */
export const nauticalTheme: SpaceInvadersThemeModule = {
  id: "nautical",
  displayName: "Aquí hay dragones (Nautical Chart)",

  registerBackgroundEffects(register) {
    registerNauticalChartCanvasEffects({
      registerBackgroundEffect: (name, effect) => register("canvas", name, effect as never)
    });
    registerNauticalChartSkiaEffects({
      registerBackgroundEffect: (name, effect) => register("skia", name, effect as never)
    });
  },

  registerDrawers(register) {
    register("canvas", SEA_DRAGON_SHAPE, drawSeaDragonSpriteCanvas);
    register("skia", SEA_DRAGON_SHAPE, drawSkiaSeaDragonSprite);
    register("canvas", GHOST_GALLEON_SHAPE, drawGhostGalleonSpriteCanvas);
    register("skia", GHOST_GALLEON_SHAPE, drawSkiaGhostGalleonSprite);
    register("canvas", "ufo", drawGhostGalleonSpriteCanvas);
    register("skia", "ufo", drawSkiaGhostGalleonSprite);
  }
};
