// src/games/shared/sprites/SpriteDrawer.ts

import type { SkCanvas, SkImage, SkPaint } from "@shopify/react-native-skia";
import { getPaint } from "../rendering/SkiaContext";
import { SpriteRegistry } from "./SpriteRegistry";
import { getCurrentFrameRect, SpriteAnimatorComponent } from "./SpriteAnimator";

// ---------------------------------------------------------------------------
// Image cache (simple, shared between Canvas & Skia)
// ---------------------------------------------------------------------------

const canvasImageCache = new Map<string, HTMLImageElement | HTMLCanvasElement>();
const skiaImageCache = new Map<string, SkImage>();

/**
 * Shared draw options accepted by the Canvas and Skia sprite drawers.
 */
export interface SpriteDrawOptions {
  /** Logical anchor of `y`: "feet" (default, frame drawn above y) or "center" (frame centered on y). */
  anchor?: "feet" | "center";
  /** Additional alpha multiplier (0..1). Defaults to 1. */
  opacity?: number;
}

/**
 * Preload a sheet for Canvas (web).
 * Call this early if you want to avoid first-frame pop-in.
 */
export function preloadSpriteSheetCanvas(sheetId: string): Promise<void> {
  const sheet = SpriteRegistry.get(sheetId);
  if (!sheet) return Promise.resolve();

  if (canvasImageCache.has(sheetId)) return Promise.resolve();

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      canvasImageCache.set(sheetId, img);
      resolve();
    };
    img.onerror = reject;

    // Metro / Expo asset handling
    const source = sheet.imageSource as { uri?: string } | number | string | undefined;
    if (typeof source === "number") {
      img.src = String(source);
    } else if (typeof source === "string") {
      img.src = source;
    } else if (source && typeof source === "object" && source.uri) {
      img.src = source.uri;
    }
  });
}

/**
 * Store a Skia image for a sheet (call after useImage / MakeImageFromEncoded).
 */
export function setSkiaImage(sheetId: string, image: SkImage | null) {
  if (image) {
    skiaImageCache.set(sheetId, image);
  } else {
    skiaImageCache.delete(sheetId);
  }
}

export function getSkiaImage(sheetId: string): SkImage | undefined {
  return skiaImageCache.get(sheetId);
}

/**
 * Whether the Canvas image for a sheet already finished loading.
 * Renderers use this to decide between the sprite path and their fallback visuals.
 */
export function isCanvasSpriteReady(sheetId: string): boolean {
  return canvasImageCache.has(sheetId);
}

// ---------------------------------------------------------------------------
// Canvas drawer
// ---------------------------------------------------------------------------

export function drawSpriteCanvas(
  ctx: CanvasRenderingContext2D,
  animator: SpriteAnimatorComponent,
  x: number,
  y: number,
  options?: SpriteDrawOptions
): void {
  const sheet = SpriteRegistry.get(animator.sheetId);
  if (!sheet) return;

  const frame = getCurrentFrameRect(animator);
  if (!frame) return;

  const img = canvasImageCache.get(animator.sheetId);
  if (!img) {
    // Lazy load attempt
    preloadSpriteSheetCanvas(animator.sheetId).catch(() => {});
    return;
  }

  const scale = animator.scale;
  const dw = frame.w * scale;
  const dh = frame.h * scale;

  const ox = (animator.offsetX ?? 0) * scale;
  const oy = (animator.offsetY ?? 0) * scale;

  ctx.save();
  ctx.globalAlpha *= (options?.opacity ?? 1);
  ctx.translate(x + ox, y + oy);

  if (animator.flipX) {
    ctx.scale(-1, 1);
    ctx.translate(-dw, 0);
  }

  // Logical anchor: feet (default) or centered on the position
  const dy = options?.anchor === "center" ? -dh / 2 : -dh;

  // Draw the frame at the chosen anchor
  ctx.drawImage(
    img as CanvasImageSource,
    frame.x,
    frame.y,
    frame.w,
    frame.h,
    -dw / 2,
    dy,
    dw,
    dh
  );

  ctx.restore();
}

// ---------------------------------------------------------------------------
// Skia drawer
// ---------------------------------------------------------------------------

export function drawSpriteSkia(
  canvas: SkCanvas,
  animator: SpriteAnimatorComponent,
  x: number,
  y: number,
  paint?: SkPaint,
  options?: SpriteDrawOptions
): void {
  const sheet = SpriteRegistry.get(animator.sheetId);
  if (!sheet) return;

  const frame = getCurrentFrameRect(animator);
  if (!frame) return;

  const image = skiaImageCache.get(animator.sheetId);
  if (!image) return;

  const scale = animator.scale;
  const dw = frame.w * scale;
  const dh = frame.h * scale;

  const ox = (animator.offsetX ?? 0) * scale;
  const oy = (animator.offsetY ?? 0) * scale;

  canvas.save();
  canvas.translate(x + ox, y + oy);

  if (animator.flipX) {
    canvas.scale(-1, 1);
    canvas.translate(-dw, 0);
  }

  // Logical anchor: feet (default) or centered on the position
  const dy = options?.anchor === "center" ? -dh / 2 : -dh;

  // Determine the paint: prefer the caller's, fall back to the shared cached one.
  // Both paths reset the alpha explicitly so opacity never leaks between draws.
  const usingCallerPaint = paint !== undefined;
  const paintToUse = paint ?? getPaint();
  const opacity = Math.max(0, Math.min(1, options?.opacity ?? 1));
  paintToUse.setAlphaf(opacity);

  // Source rect → dest rect (anchor above origin)
  const src = { x: frame.x, y: frame.y, width: frame.w, height: frame.h };
  const dst = { x: -dw / 2, y: dy, width: dw, height: dh };

  canvas.drawImageRect(image, src, dst, paintToUse);

  canvas.restore();

  // Restore the shared paint's alpha so other drawers using getPaint() are unaffected.
  if (!usingCallerPaint) paintToUse.setAlphaf(1);

  canvas.restore();
}

// ---------------------------------------------------------------------------
// Convenience: get logical size
// ---------------------------------------------------------------------------

export function getSpriteLogicalSize(sheetId: string): { w: number; h: number } | null {
  const sheet = SpriteRegistry.get(sheetId);
  if (!sheet) return null;
  return { w: sheet.frameWidth, h: sheet.frameHeight };
}
