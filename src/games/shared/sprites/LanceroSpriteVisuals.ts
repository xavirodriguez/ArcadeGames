/**
 * Lancero end-to-end template: SpriteRegistry sheet + Canvas/Skia drawers.
 * Frame grid is provisional (see SpriteRegistry LANCERO). Use as the pattern
 * for kapa / kichisake / qiongqi / enemy3 after measuring their sheets.
 */
import type { ShapeDrawer, World, CoreComponentRegistry, RenderComponent } from "@tiny-aster/core";
import type { SkCanvas } from "../rendering/SkiaContext";
import {
  createSpriteAnimator,
  drawSpriteCanvas,
  drawSpriteSkia,
  getSkiaImage,
  isCanvasSpriteReady,
  preloadSpriteSheetCanvas,
  updateSpriteAnimator,
  SpriteRegistry,
} from "./index";

export const LANCERO_SPRITE_ID = "lancero";
export const LANCERO_SHAPE = "lancero";

const animatorByWorld = new WeakMap<object, ReturnType<typeof createSpriteAnimator>>();

function getAnimator(world: object) {
  let a = animatorByWorld.get(world);
  if (!a) {
    if (!SpriteRegistry.has(LANCERO_SPRITE_ID)) {
      SpriteRegistry.init();
    }
    a = createSpriteAnimator(LANCERO_SPRITE_ID, "idle");
    animatorByWorld.set(world, a);
  }
  return a;
}

function readRender(world: World<CoreComponentRegistry>, entity: number): RenderComponent | null {
  const render = world.getComponent(entity, "Render") as RenderComponent | undefined;
  if (!render || !render.visible) return null;
  return render;
}

let canvasPreloadStarted = false;
function kickOffCanvasPreload(): void {
  if (canvasPreloadStarted || typeof Image === "undefined") return;
  canvasPreloadStarted = true;
  preloadSpriteSheetCanvas(LANCERO_SPRITE_ID).catch(() => {
    canvasPreloadStarted = false;
  });
}

function drawLanceroFallback(ctx: CanvasRenderingContext2D, size: number): void {
  const s = Math.max(12, size);
  ctx.fillStyle = "#c4a574";
  ctx.strokeStyle = "#2b2118";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(0, -s * 0.1, s * 0.35, s * 0.55, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

export const drawLanceroSpriteCanvas: ShapeDrawer<CanvasRenderingContext2D, CoreComponentRegistry> = {
  draw(ctx, world, entity) {
    const render = readRender(world, entity);
    if (!render) return;
    const animator = getAnimator(world);
    updateSpriteAnimator(animator, 1 / 60);
    if (isCanvasSpriteReady(LANCERO_SPRITE_ID)) {
      drawSpriteCanvas(ctx, animator, 0, 0, { anchor: "feet", opacity: render.opacity });
      return;
    }
    kickOffCanvasPreload();
    drawLanceroFallback(ctx, render.size ?? 32);
  },
};

export const drawSkiaLanceroSprite: ShapeDrawer<SkCanvas, CoreComponentRegistry> = {
  draw(canvas, world, entity) {
    const render = readRender(world, entity);
    if (!render) return;
    const animator = getAnimator(world);
    updateSpriteAnimator(animator, 1 / 60);
    if (!getSkiaImage(LANCERO_SPRITE_ID)) {
      return;
    }
    drawSpriteSkia(canvas, animator, 0, 0, undefined, { anchor: "feet", opacity: render.opacity });
  },
};
