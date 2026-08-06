import {
  World,
  ShapeDrawer,
  Renderer,
  RendererUtils,
  TransformComponent,
  RenderComponent,
  ColliderComponent,
  CircleShape,
  TTLComponent
} from "@tiny-aster/core";
import { AsteroidsComponentRegistry } from "../types/AsteroidRegistry";
import {
  drawAsteroidsPlayerShip as canvasDrawAsteroidsPlayerShip,
  drawAsteroidsAsteroid as canvasDrawAsteroidsAsteroid,
  drawAsteroidsBullet as canvasDrawAsteroidsBullet
} from "./AsteroidsCanvasVisuals";
import {
  drawSkiaAsteroidsPlayerShip as skiaDrawAsteroidsPlayerShip,
  drawSkiaAsteroidsAsteroid as skiaDrawAsteroidsAsteroid,
  drawSkiaAsteroidsBullet as skiaDrawAsteroidsBullet
} from "./AsteroidsSkiaVisuals";

// Dynamically import Skia safely to support Node-based Jest tests without throwing
let Skia: any = null;
try {
  Skia = require("@shopify/react-native-skia").Skia;
} catch {
  // Silent fallback in test environments
}



// -------------------------------------------------------------
// Centralized Initialization function
// -------------------------------------------------------------

/** @public */
export const initializeAsteroidsRenderer = (renderer: Renderer<AsteroidsComponentRegistry, any>) => {
  RendererUtils.registerAssets(renderer, {
    canvas: (r) => {
      r.registerShape("player_ship", canvasDrawAsteroidsPlayerShip);
      r.registerShape("asteroid", canvasDrawAsteroidsAsteroid);
      r.registerShape("bullet", canvasDrawAsteroidsBullet);
    },
    skia: (r) => {
      r.registerShape("player_ship", skiaDrawAsteroidsPlayerShip);
      r.registerShape("asteroid", skiaDrawAsteroidsAsteroid);
      r.registerShape("bullet", skiaDrawAsteroidsBullet);
    }
  });
};
