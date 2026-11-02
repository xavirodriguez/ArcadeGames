import type { Theme } from "@tiny-aster/core";
import type { OutrunGameplayMod, OutrunVisualMod } from "../types";
import { classicTheme } from "../classic/ClassicTheme";
import {
  drawOutrunRoad,
  drawOutrunRacer
} from "../../rendering/OutrunCanvasVisuals";
import {
  drawSkiaOutrunRoad,
  drawSkiaOutrunRacer
} from "../../rendering/OutrunSkiaVisuals";
import {
  drawArcadeMotorcycleCanvas,
  drawArcadeMotorcycleSkia
} from "./ArcadeMotorcycleDrawers";

/**
 * Arcade Hang-On / Super Hang-On-inspired player motorcycle.
 *
 * Activation:
 * - Game options: new OutrunGame({ gameOptions: { mod: "arcade-moto" } })
 * - Config: set VISUAL_MOD to "arcade-moto".
 *
 * This mod replaces only the player's outrun_car presentation drawer. Road,
 * traffic, collision geometry, physics and deterministic simulation stay shared.
 */
export const arcadeMotorcycleMod: OutrunVisualMod = {
  id: "arcade-moto",
  displayName: "Arcade Moto",

  createTheme(baseTheme: Theme): Theme {
    return baseTheme;
  },

  registerDrawers(register) {
    register("canvas", "road", drawOutrunRoad);
    register("canvas", "outrun_car", drawArcadeMotorcycleCanvas);
    register("canvas", "outrun_racer", drawOutrunRacer);

    register("skia", "road", drawSkiaOutrunRoad);
    register("skia", "outrun_car", drawArcadeMotorcycleSkia);
    register("skia", "outrun_racer", drawSkiaOutrunRacer);
  },

  resolveScenarioDecorKind: classicTheme.resolveScenarioDecorKind,
  resolveRoadsideKind: classicTheme.resolveRoadsideKind,
  resolveTrafficVehicleShape: classicTheme.resolveTrafficVehicleShape
};

/** Identity-matched no-op gameplay descriptor: Arcade Moto changes no game rules. */
export const arcadeMotorcycleGameplayMod: OutrunGameplayMod = {
  id: "arcade-moto"
};
