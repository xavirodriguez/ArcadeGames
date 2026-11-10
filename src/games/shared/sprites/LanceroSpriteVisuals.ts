/**
 * Lancero end-to-end template: SpriteRegistry sheet + Canvas/Skia drawers.
 * Frame grid is provisional (see SpriteRegistry LANCERO). Use as the pattern
 * for kapa / kichisake / qiongqi / enemy3 after measuring their sheets.
 */
import type { ShapeDrawer, World, CoreComponentRegistry, RenderComponent } from "@tiny-aster/core";
import type { SkCanvas } from "../rendering/SkiaContext";
import { Skia, getPaint } from "../rendering/SkiaContext";
import {
  createSpriteAnimator,
  drawSpriteCanvas,
  drawSpriteSkia,
  isCanvasSpriteReady,
  preloadSpriteSheetCanvas,
  updateSpriteAnimator,
  SpriteRegistry,
  type SpriteAnimatorComponent,
} from "./index";

export const LANCERO_SPRITE_ID = "lancero";
export const LANCERO_SHAPE = "lancero";

const fallbackStaticAnimator: SpriteAnimatorComponent = {
  type: "SpriteAnimator",
  sheetId: LANCERO_SPRITE_ID,
  currentAnim: "idle",
  frameIndex: 0,
  timer: 0,
  flipX: false,
  scale: 1,
};

function resolveEntityAnimator(world: World<CoreComponentRegistry>, entity: number): SpriteAnimatorComponent {
  const c = world.getComponent(entity, "SpriteAnimator");
  return c?.sheetId === LANCERO_SPRITE_ID ? c : fallbackStaticAnimator;
}

function readRender(world: World<CoreComponentRegistry>, entity: number): RenderComponent | null {
  const render = world.getComponent(entity, "Render") as RenderComponent | undefined;
  return !render || !render.visible ? null : render;
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
    const animator = resolveEntityAnimator(world, entity);
    if (isCanvasSpriteReady(LANCERO_SPRITE_ID)) {
      drawSpriteCanvas(ctx, animator, 0, 0, { anchor: "feet", opacity: render.opacity });
      return;
    }
    kickOffCanvasPreload();
    drawLanceroFallback(ctx, render.size ?? 32);
  },
};

function drawLanceroFallbackSkia(
  canvas: SkCanvas,
  size: number,
  opacity: number
): void {
  if (!Skia) return;
  const paint = getPaint();
  if (!paint) return;

  const s = Math.max(12, size);
  const alpha = Math.max(0, Math.min(1, opacity));
  if (alpha <= 0) return;

  // Match the Canvas fallback bounds in the same feet-relative local space.
  const oval = Skia.XYWHRect(-s * 0.35, -s * 0.65, s * 0.7, s * 1.1);
  paint.reset();
  paint.setAntiAlias(true);
  paint.setAlphaf(alpha);
  paint.setStyle(Skia.PaintStyle?.Fill ?? 0);
  paint.setColor(Skia.Color("#c4a574"));
  canvas.drawOval(oval, paint);

  paint.setStyle(Skia.PaintStyle?.Stroke ?? 1);
  paint.setStrokeWidth(2);
  paint.setColor(Skia.Color("#2b2118"));
  canvas.drawOval(oval, paint);
  paint.reset();
}

export const drawSkiaLanceroSprite: ShapeDrawer<SkCanvas, CoreComponentRegistry> = {
  draw(canvas, world, entity) {
    const render = readRender(world, entity);
    if (!render || !Skia) return;

    const animator = resolveEntityAnimator(world, entity);
    const opacity = Math.max(0, Math.min(1, render.opacity ?? 1));
    if (opacity <= 0) return;

    if (drawSpriteSkia(canvas, animator, 0, 0, undefined, { anchor: "feet", opacity })) {
      return;
    }

    // drawSpriteSkia starts the existing async preload and returns false while
    // the image is unavailable; keep Lancero visible until the cache is ready.
    canvas.save();
    try {
      const offsetX = (animator.offsetX ?? 0) * animator.scale;
      const offsetY = (animator.offsetY ?? 0) * animator.scale;
      canvas.translate(offsetX, offsetY);
      if (animator.flipX) canvas.scale(-1, 1);
      drawLanceroFallbackSkia(canvas, render.size ?? 32, opacity);
    } finally {
      canvas.restore();
    }
  },
};
