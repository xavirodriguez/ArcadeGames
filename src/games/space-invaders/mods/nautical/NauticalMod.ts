import type { SpaceInvadersMod } from "../types";
import { registerNauticalChartCanvasEffects, registerNauticalChartSkiaEffects } from "./rendering/registerNauticalChartEffects";
import { NauticalWindSystem } from "./NauticalWindSystem";
import { IslandErosionSystem } from "./IslandErosionSystem";
import { drawSeaDragonSpriteCanvas, drawSkiaSeaDragonSprite, SEA_DRAGON_SHAPE } from "../../rendering/SeaDragonVisuals";
import { SystemPhase } from "@tiny-aster/core";

/**
 * Nautical mod for Space Invaders ("Aquí hay dragones" / parchment chart theme).
 */
export const nauticalMod: SpaceInvadersMod = {
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
    // Sea dragon ("dragón marino", art bible §12.2): canvas + skia drawers share
    // the same registered SpriteRegistry sheet, so both backends stay in parity.
    register("canvas", SEA_DRAGON_SHAPE, drawSeaDragonSpriteCanvas);
    register("skia", SEA_DRAGON_SHAPE, drawSkiaSeaDragonSprite);
  },

  registerSystems(world) {
    world.addSystem(new NauticalWindSystem(), { phase: SystemPhase.Simulation, group: "simulation" });
    world.addSystem(new IslandErosionSystem(), { phase: SystemPhase.Presentation, group: "presentation" });
  }
};
