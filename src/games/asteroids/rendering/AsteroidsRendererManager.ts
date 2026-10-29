import {
  ShapeDrawer,
  Renderer,
  RendererUtils
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
import type { ThemeModule } from "../presentation/types";

/**
 * Registers Asteroids shape drawers and HUD for Canvas + Skia.
 * When a visual mod is provided, its drawers take precedence over the
 * classic defaults; mission HUD remains shared.
 *
 * @public
 */
export const initializeAsteroidsRenderer = (
  renderer: Renderer<AsteroidsComponentRegistry, any>,
  themeModule?: ThemeModule,
  customDrawers?: Record<string, ShapeDrawer<any, AsteroidsComponentRegistry>>
) => {
  RendererUtils.registerAssets(renderer, {
    canvas: (r) => {
      if (themeModule) {
        themeModule.registerDrawers((backend, shape, drawer) => {
          if (backend === "canvas") {
            r.registerShape(shape, drawer);
          }
        });
        themeModule.registerBackgroundEffects?.((backend, name, effect) => {
          if (backend === "canvas") {
            r.registerBackgroundEffect(name, effect as never);
          }
        });
      } else {
        r.registerShape("player_ship", canvasDrawAsteroidsPlayerShip);
        r.registerShape("asteroid", canvasDrawAsteroidsAsteroid);
        r.registerShape("bullet", canvasDrawAsteroidsBullet);
      }

      let canvasHudRegistered = false;
      if (themeModule?.registerHud) {
        themeModule.registerHud((backend, name, effect) => {
          if (backend === "canvas") {
            r.registerBackgroundEffect(name, effect as never);
            canvasHudRegistered = true;
          }
        });
      }
      if (!canvasHudRegistered) {
        r.registerBackgroundEffect("mission_hud", canvasDrawAsteroidsMissionHUD);
      }

      if (customDrawers) {
        for (const [key, drawer] of Object.entries(customDrawers)) {
          r.registerShape(key, drawer);
        }
      }
    },
    skia: (r) => {
      if (themeModule) {
        themeModule.registerDrawers((backend, shape, drawer) => {
          if (backend === "skia") {
            r.registerShape(shape, drawer);
          }
        });
        themeModule.registerBackgroundEffects?.((backend, name, effect) => {
          if (backend === "skia") {
            r.registerBackgroundEffect(name, effect as never);
          }
        });
      } else {
        r.registerShape("player_ship", skiaDrawAsteroidsPlayerShip);
        r.registerShape("asteroid", skiaDrawAsteroidsAsteroid);
        r.registerShape("bullet", skiaDrawAsteroidsBullet);
      }

      let skiaHudRegistered = false;
      if (themeModule?.registerHud) {
        themeModule.registerHud((backend, name, effect) => {
          if (backend === "skia") {
            r.registerBackgroundEffect(name, effect as never);
            skiaHudRegistered = true;
          }
        });
      }
      if (!skiaHudRegistered) {
        r.registerBackgroundEffect("mission_hud", skiaDrawAsteroidsMissionHUD);
      }

      if (customDrawers) {
        for (const [key, drawer] of Object.entries(customDrawers)) {
          r.registerShape(key, drawer);
        }
      }
    }
  });
};
