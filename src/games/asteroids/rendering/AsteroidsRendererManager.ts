import {
  World,
  ShapeDrawer,
  Renderer,
  TransformComponent,
  RenderComponent,
  ColliderComponent,
  CircleShape,
  TTLComponent
} from "@tiny-aster/core";
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
