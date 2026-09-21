import { EffectDrawer } from "@tiny-aster/core";
import { FlappyBirdComponentRegistry } from "../types/FlappyBirdTypes";
import { createCanvasMissionHUD } from "../../shared/rendering/SharedMissionHUD";

/**
 * Renders the active mini-mission HUD overlay for Flappy Bird Canvas2D renderer.
 * @public
 */
export const drawFlappyBirdMissionHUD: EffectDrawer<CanvasRenderingContext2D, FlappyBirdComponentRegistry> = createCanvasMissionHUD();
