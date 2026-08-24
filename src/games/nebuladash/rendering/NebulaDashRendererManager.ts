import { Renderer, RendererUtils } from "@tiny-aster/core";
import {
  drawNebulaPlayer,
  drawNebulaGap,
  drawNebulaAsteroid,
  drawNebulaPlasmaWall
} from "./NebulaDashCanvasVisuals";
import {
  drawSkiaNebulaPlayer,
  drawSkiaNebulaGap,
  drawSkiaNebulaAsteroid,
  drawSkiaNebulaPlasmaWall
} from "./NebulaDashSkiaVisuals";

export function initializeNebulaDashRenderer(renderer: Renderer<any, any>): void {
  RendererUtils.registerAssets(renderer, {
    canvas: (r) => {
      r.registerShape("nebula_player", drawNebulaPlayer);
      r.registerShape("nebula_gap", drawNebulaGap);
      r.registerShape("nebula_asteroid", drawNebulaAsteroid);
      r.registerShape("nebula_plasma_wall", drawNebulaPlasmaWall);
    },
    skia: (r) => {
      r.registerShape("nebula_player", drawSkiaNebulaPlayer);
      r.registerShape("nebula_gap", drawSkiaNebulaGap);
      r.registerShape("nebula_asteroid", drawSkiaNebulaAsteroid);
      r.registerShape("nebula_plasma_wall", drawSkiaNebulaPlasmaWall);
    }
  });
}
