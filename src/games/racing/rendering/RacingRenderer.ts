import { Renderer, RendererUtils } from "@tiny-aster/core";
import type { RacingComponentRegistry } from "../types/RacingRegistry";
import {
  drawTrackSurface,
  drawTrackRibbon,
  drawSkidMarks,
  drawSmoke,
  drawRacingCar,
  drawTrackWall,
  drawCheckpoint,
  drawTrackZone,
  drawTrackObstacle
} from "./RacingCanvasVisuals";
import {
  drawSkiaTrackSurface,
  drawSkiaTrackRibbon,
  drawSkiaSkidMarks,
  drawSkiaSmoke,
  drawSkiaRacingCar,
  drawSkiaTrackWall,
  drawSkiaCheckpoint,
  drawSkiaTrackZone,
  drawSkiaTrackObstacle
} from "./RacingSkiaVisuals";

export function initializeRacingRenderer(renderer: Renderer<RacingComponentRegistry, unknown>): void {
  RendererUtils.registerAssets(renderer, {
    canvas: (r) => {
      r.registerShape("track_surface", drawTrackSurface);
      r.registerShape("track_ribbon", drawTrackRibbon);
      r.registerShape("skid_marks", drawSkidMarks);
      r.registerShape("smoke", drawSmoke);
      r.registerShape("racing_car", drawRacingCar);
      r.registerShape("track_wall", drawTrackWall);
      r.registerShape("checkpoint", drawCheckpoint);
      r.registerShape("track_zone", drawTrackZone);
      r.registerShape("track_obstacle", drawTrackObstacle);
    },
    skia: (r) => {
      r.registerShape("track_surface", drawSkiaTrackSurface as never);
      r.registerShape("track_ribbon", drawSkiaTrackRibbon as never);
      r.registerShape("skid_marks", drawSkiaSkidMarks as never);
      r.registerShape("smoke", drawSkiaSmoke as never);
      r.registerShape("racing_car", drawSkiaRacingCar as never);
      r.registerShape("track_wall", drawSkiaTrackWall as never);
      r.registerShape("checkpoint", drawSkiaCheckpoint as never);
      r.registerShape("track_zone", drawSkiaTrackZone as never);
      r.registerShape("track_obstacle", drawSkiaTrackObstacle as never);
    }
  });
}
