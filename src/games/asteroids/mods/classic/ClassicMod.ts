import type { Theme } from "@tiny-aster/core";
import type { AsteroidsVisualMod } from "../types";
import {
  drawAsteroidsPlayerShip as canvasDrawAsteroidsPlayerShip,
  drawAsteroidsAsteroid as canvasDrawAsteroidsAsteroid,
  drawAsteroidsBullet as canvasDrawAsteroidsBullet
} from "../../rendering/AsteroidsCanvasVisuals";
import {
  drawSkiaAsteroidsPlayerShip as skiaDrawAsteroidsPlayerShip,
  drawSkiaAsteroidsAsteroid as skiaDrawAsteroidsAsteroid,
  drawSkiaAsteroidsBullet as skiaDrawAsteroidsBullet
} from "../../rendering/AsteroidsSkiaVisuals";

/**
 * Classic visual mod — current neon / procedural Asteroids look.
 * Zero behavioural or visual change vs pre-mod baseline.
 *
 * @public
 */
export const classicMod: AsteroidsVisualMod = {
  id: "classic",
  displayName: "Classic",
  particleStyle: "neon",

  createTheme(baseTheme: Theme): Theme {
    return baseTheme;
  },

  registerDrawers(register) {
    register("canvas", "player_ship", canvasDrawAsteroidsPlayerShip as never);
    register("canvas", "asteroid", canvasDrawAsteroidsAsteroid as never);
    register("canvas", "bullet", canvasDrawAsteroidsBullet as never);

    register("skia", "player_ship", skiaDrawAsteroidsPlayerShip as never);
    register("skia", "asteroid", skiaDrawAsteroidsAsteroid as never);
    register("skia", "bullet", skiaDrawAsteroidsBullet as never);
  }
};
