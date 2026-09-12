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
  drawAsteroidsBullet as canvasDrawAsteroidsBullet,
  drawAsteroidsMissionHUD as canvasDrawAsteroidsMissionHUD
} from "./AsteroidsCanvasVisuals";
import { drawAsteroidsMissionHUD } from "./AsteroidsMissionHUD";
import {
  drawSkiaAsteroidsPlayerShip as skiaDrawAsteroidsPlayerShip,
  drawSkiaAsteroidsAsteroid as skiaDrawAsteroidsAsteroid,
  drawSkiaAsteroidsBullet as skiaDrawAsteroidsBullet,
  drawSkiaAsteroidsMissionHUD as skiaDrawAsteroidsMissionHUD
} from "./AsteroidsSkiaVisuals";

import { Skia } from "../../shared/rendering/SkiaContext";



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
      r.registerBackgroundEffect("mission_hud", canvasDrawAsteroidsMissionHUD);
    },
    skia: (r) => {
      r.registerShape("player_ship", skiaDrawAsteroidsPlayerShip);
      r.registerShape("asteroid", skiaDrawAsteroidsAsteroid);
      r.registerShape("bullet", skiaDrawAsteroidsBullet);
      r.registerBackgroundEffect("mission_hud", skiaDrawAsteroidsMissionHUD);
    }
  });
};
