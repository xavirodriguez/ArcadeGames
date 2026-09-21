import { EffectDrawer } from "@tiny-aster/core";
import { FlappyBirdComponentRegistry } from "../types/FlappyBirdTypes";
import { createSkiaMissionHUD } from "../../shared/rendering/SharedMissionHUD";

/**
 * Overlay shape drawer for React Native Skia Mission HUD in Flappy Bird.
 * @public
 */
export const drawSkiaFlappyBirdMissionHUD: EffectDrawer<any, FlappyBirdComponentRegistry> = createSkiaMissionHUD();
