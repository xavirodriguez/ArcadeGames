import type { ShapeDrawer } from "@tiny-aster/core";
import type { ShmupComponentRegistry } from "../types/ShmupTypes";
import type { SkCanvas } from "../../shared/rendering/SkiaContext";
import { drawShmupPlayerBullet, drawShmupEnemyBullet } from "./ShmupCanvasVisuals";
import { drawSkiaShmupPlayerBullet, drawSkiaShmupEnemyBullet } from "./ShmupSkiaVisuals";
import { drawSumiECanvasPlayerBullet, drawSumiECanvasEnemyBullet } from "./SumiECanvasProjectiles";
import { drawSumiESkiaPlayerBullet, drawSumiESkiaEnemyBullet } from "./SumiESkiaProjectiles";

export const drawThemeCanvasPlayerBullet: ShapeDrawer<CanvasRenderingContext2D, ShmupComponentRegistry> = {
  draw(ctx, world, entity) {
    if (world.getResource<string>("ShmupVisualTheme") === "sumi-e") drawSumiECanvasPlayerBullet.draw(ctx, world, entity);
    else drawShmupPlayerBullet.draw(ctx, world, entity);
  }
};
export const drawThemeCanvasEnemyBullet: ShapeDrawer<CanvasRenderingContext2D, ShmupComponentRegistry> = {
  draw(ctx, world, entity) {
    if (world.getResource<string>("ShmupVisualTheme") === "sumi-e") drawSumiECanvasEnemyBullet.draw(ctx, world, entity);
    else drawShmupEnemyBullet.draw(ctx, world, entity);
  }
};
export const drawThemeSkiaPlayerBullet: ShapeDrawer<SkCanvas, ShmupComponentRegistry> = {
  draw(canvas, world, entity) {
    if (world.getResource<string>("ShmupVisualTheme") === "sumi-e") drawSumiESkiaPlayerBullet.draw(canvas, world, entity);
    else drawSkiaShmupPlayerBullet.draw(canvas, world, entity);
  }
};
export const drawThemeSkiaEnemyBullet: ShapeDrawer<SkCanvas, ShmupComponentRegistry> = {
  draw(canvas, world, entity) {
    if (world.getResource<string>("ShmupVisualTheme") === "sumi-e") drawSumiESkiaEnemyBullet.draw(canvas, world, entity);
    else drawSkiaShmupEnemyBullet.draw(canvas, world, entity);
  }
};