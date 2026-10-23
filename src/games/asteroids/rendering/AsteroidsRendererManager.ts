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
import { drawAsteroidsMissionHUD as canvasDrawAsteroidsMissionHUD } from "./AsteroidsMissionHUD";
import {
  drawSkiaAsteroidsPlayerShip as skiaDrawAsteroidsPlayerShip,
  drawSkiaAsteroidsAsteroid as skiaDrawAsteroidsAsteroid,
  drawSkiaAsteroidsBullet as skiaDrawAsteroidsBullet,
  drawSkiaAsteroidsMissionHUD as skiaDrawAsteroidsMissionHUD
} from "./AsteroidsSkiaVisuals";

import { Skia } from "../../shared/rendering/SkiaContext";

/** @public */
export const initializeAsteroidsRenderer = (
  renderer: Renderer<AsteroidsComponentRegistry, any>,
  customDrawers?: Record<string, ShapeDrawer<any, AsteroidsComponentRegistry>>
) => {
  RendererUtils.registerAssets(renderer, {
    canvas: (r) => {
      r.registerShape("player_ship", canvasDrawAsteroidsPlayerShip);
      r.registerShape("asteroid", canvasDrawAsteroidsAsteroid);
      r.registerShape("bullet", canvasDrawAsteroidsBullet);
      r.registerBackgroundEffect("mission_hud", canvasDrawAsteroidsMissionHUD);

      if (customDrawers) {
        for (const [key, drawer] of Object.entries(customDrawers)) {
          r.registerShape(key, drawer);
        }
      }
    },
    skia: (r) => {
      r.registerShape("player_ship", skiaDrawAsteroidsPlayerShip);
      r.registerShape("asteroid", skiaDrawAsteroidsAsteroid);
      r.registerShape("bullet", skiaDrawAsteroidsBullet);
      r.registerBackgroundEffect("mission_hud", skiaDrawAsteroidsMissionHUD);

      if (customDrawers) {
        for (const [key, drawer] of Object.entries(customDrawers)) {
          r.registerShape(key, drawer);
        }
      }
    }
  });
};
