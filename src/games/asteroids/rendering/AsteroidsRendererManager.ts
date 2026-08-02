import { Renderer } from "@tiny-aster/core";
import { AsteroidsComponentRegistry } from "../types/AsteroidRegistry";
import {
  drawAsteroidsPlayerShip,
  drawAsteroidsAsteroid,
  drawAsteroidsBullet
} from "./AsteroidsCanvasVisuals";
import {
  drawSkiaAsteroidsPlayerShip,
  drawSkiaAsteroidsAsteroid,
  drawSkiaAsteroidsBullet
} from "./AsteroidsSkiaVisuals";

/** @public */
export const initializeAsteroidsRenderer = (renderer: Renderer<AsteroidsComponentRegistry>) => {
  const r = renderer as any;
  if (r.type === "canvas") {
    r.registerShape("player_ship", drawAsteroidsPlayerShip);
    r.registerShape("asteroid", drawAsteroidsAsteroid);
    r.registerShape("bullet", drawAsteroidsBullet);
  } else if (r.type === "skia") {
    r.registerShape("player_ship", drawSkiaAsteroidsPlayerShip);
    r.registerShape("asteroid", drawSkiaAsteroidsAsteroid);
    r.registerShape("bullet", drawSkiaAsteroidsBullet);
  }
};
