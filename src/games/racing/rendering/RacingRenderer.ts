import { Renderer, RendererUtils } from "@tiny-aster/core";
import type { RacingComponentRegistry } from "../types/RacingRegistry";
import { drawRacingCar, drawTrackWall, drawCheckpoint, drawTrackZone, drawTrackObstacle } from "./RacingCanvasVisuals";
import { drawSkiaRacingCar, drawSkiaTrackWall, drawSkiaCheckpoint, drawSkiaTrackZone, drawSkiaTrackObstacle } from "./RacingSkiaVisuals";

export function initializeRacingRenderer(renderer: Renderer<RacingComponentRegistry, unknown>): void {
  RendererUtils.registerAssets(renderer, {
    canvas: (r) => {
      r.registerShape("racing_car", drawRacingCar);
      r.registerShape("track_wall", drawTrackWall);
      r.registerShape("checkpoint", drawCheckpoint);
      r.registerShape("track_zone", drawTrackZone);
      r.registerShape("track_obstacle", drawTrackObstacle);
    },
    skia: (r) => {
      r.registerShape("racing_car", drawSkiaRacingCar);
      r.registerShape("track_wall", drawSkiaTrackWall);
      r.registerShape("checkpoint", drawSkiaCheckpoint);
      r.registerShape("track_zone", drawSkiaTrackZone);
      r.registerShape("track_obstacle", drawSkiaTrackObstacle);
    }
  });
}
