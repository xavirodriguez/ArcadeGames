import type { Theme } from "@tiny-aster/core";
import type { ThemeModule } from "../../presentation/types";
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

/** Existing neon/procedural look; drawer implementations remain unchanged. */
export const classicTheme: ThemeModule = {
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
