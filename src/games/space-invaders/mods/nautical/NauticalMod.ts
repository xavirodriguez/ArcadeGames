import type { SpaceInvadersMod } from "../types";
import { registerNauticalChartCanvasEffects, registerNauticalChartSkiaEffects } from "./rendering/registerNauticalChartEffects";
import { NauticalWindSystem } from "./NauticalWindSystem";
import { IslandErosionSystem } from "./IslandErosionSystem";
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

  registerSystems(world) {
    world.addSystem(new NauticalWindSystem(), { phase: SystemPhase.Simulation, group: "simulation" });
    world.addSystem(new IslandErosionSystem(), { phase: SystemPhase.Presentation, group: "presentation" });
  }
};
