import { Renderer, RendererUtils } from "@tiny-aster/core";
import type { RacingComponentRegistry } from "../types/RacingRegistry";
import { drawRacingCar, drawTrackWall, drawCheckpoint } from "./RacingCanvasVisuals";

export function initializeRacingRenderer(renderer: Renderer<RacingComponentRegistry, unknown>): void {
  RendererUtils.registerAssets(renderer, {
    canvas: (r) => {
      r.registerShape("racing_car", drawRacingCar);
      r.registerShape("track_wall", drawTrackWall);
      r.registerShape("checkpoint", drawCheckpoint);
    },
    skia: () => {}
  });
}
