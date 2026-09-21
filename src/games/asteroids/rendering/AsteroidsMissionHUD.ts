import { EffectDrawer } from "@tiny-aster/core";
import { AsteroidsComponentRegistry } from "../types/AsteroidRegistry";
import { createCanvasMissionHUD } from "../../shared/rendering/SharedMissionHUD";

/**
 * Renders the active mini-mission HUD overlay for Canvas2D renderer in Asteroids.
 * @public
 */
export const drawAsteroidsMissionHUD: EffectDrawer<CanvasRenderingContext2D, AsteroidsComponentRegistry> = createCanvasMissionHUD();
