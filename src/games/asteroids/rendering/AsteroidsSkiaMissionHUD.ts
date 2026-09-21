import { EffectDrawer } from "@tiny-aster/core";
import { AsteroidsComponentRegistry } from "../types/AsteroidRegistry";
import { createSkiaMissionHUD } from "../../shared/rendering/SharedMissionHUD";

/**
 * Overlay shape drawer for React Native Skia Mission HUD in Asteroids.
 * @public
 */
export const drawSkiaAsteroidsMissionHUD: EffectDrawer<any, AsteroidsComponentRegistry> = createSkiaMissionHUD();
