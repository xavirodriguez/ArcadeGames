import { SystemPhase } from "@tiny-aster/core";
import type { SpaceInvadersGameplayMod } from "../types";
import { NauticalWindSystem } from "./NauticalWindSystem";
import { IslandErosionSystem } from "./IslandErosionSystem";

/** Nautical-only simulation/feedback systems, registered separately from its visual theme. */
export const nauticalGameplayMod: SpaceInvadersGameplayMod = {
  id: "nautical",

  registerSystems(world) {
    world.addSystem(new NauticalWindSystem(), { phase: SystemPhase.Simulation, group: "simulation" });
    world.addSystem(new IslandErosionSystem(), { phase: SystemPhase.Presentation, group: "presentation" });
  }
};
