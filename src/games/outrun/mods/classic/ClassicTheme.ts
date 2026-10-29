import type { Theme } from "@tiny-aster/core";
import type { OutrunThemeModule } from "../types";
import {
  drawOutrunRoad,
  drawOutrunCar,
  drawOutrunRacer,
  drawOutrunHud
} from "../../rendering/OutrunCanvasVisuals";
import {
  drawSkiaOutrunRoad,
  drawSkiaOutrunCar,
  drawSkiaOutrunRacer,
  drawSkiaOutrunHud
} from "../../rendering/OutrunSkiaVisuals";

/**
 * Classic Outrun visual mod (cars, asphalt, palm/pine/cactus/tree decor).
 * Replicates the original default visual behavior pixel-for-pixel.
 *
 * @public
 */
export const classicTheme: OutrunThemeModule = {
  id: "classic",
  displayName: "Classic Outrun",

  createTheme(baseTheme: Theme): Theme {
    return baseTheme;
  },

  registerDrawers(register) {
    register("canvas", "road", drawOutrunRoad);
    register("canvas", "outrun_car", drawOutrunCar);
    register("canvas", "outrun_racer", drawOutrunRacer);

    register("skia", "road", drawSkiaOutrunRoad);
    register("skia", "outrun_car", drawSkiaOutrunCar);
    register("skia", "outrun_racer", drawSkiaOutrunRacer);
  },

  registerBackgroundEffects(register) {
    register("canvas", "outrun_hud", drawOutrunHud);
    register("skia", "outrun_hud", drawSkiaOutrunHud);
  },

  resolveScenarioDecorKind(scenarioId: string, slotHash: number): string {
    if (scenarioId === "coast" || scenarioId === "classic_coast") {
      return slotHash > 0.35 ? "palm" : "lighthouse";
    } else if (scenarioId === "desert" || scenarioId === "classic_desert") {
      return slotHash > 0.42 ? "cactus" : "dry_shrub";
    } else if (scenarioId === "mountain" || scenarioId === "classic_mountain") {
      return slotHash > 0.66 ? "tree" : slotHash > 0.33 ? "pine" : "rock";
    }
    return "tree";
  },

  resolveRoadsideKind(kind: string): string {
    switch (kind) {
      case "tree":
      case "pine":
      case "rock":
      case "palm":
      case "lighthouse":
      case "cactus":
      case "dry_shrub":
      case "wind_tower":
        return kind;
      case "cypress":
        return "pine";
      case "wall":
        return "rock";
      case "lamp":
        return "lighthouse";
      case "shrub":
        return "dry_shrub";
      default:
        return "dry_shrub";
    }
  },

  resolveTrafficVehicleShape(styleIndex: number): string {
    const shapeIndex = ((Math.trunc(styleIndex) % 3) + 3) % 3;
    return shapeIndex === 0 ? "coupe" : shapeIndex === 1 ? "van" : "truck";
  }
};
