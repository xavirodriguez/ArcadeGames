// src/games/shared/sprites/SpriteDrawer.ts

import type { SkCanvas, SkImage } from "@shopify/react-native-skia";
import { SpriteRegistry } from "./SpriteRegistry";
import { getCurrentFrameRect, SpriteAnimatorComponent } from "./SpriteAnimator";
import { SpriteSheetDef } from "./SpriteTypes";

// ---------------------------------------------------------------------------
// Image cache (simple, shared between Canvas & Skia)
// ---------------------------------------------------------------------------

const canvasImageCache = new Map<string, HTMLImageElement | HTMLCanvasElement>();
const skiaImageCache = new Map<string, SkImage>();

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
    if (typeof sheet.imageSource === "number") {
      // In RN web this usually resolves via asset registry; fallback to string
      // For pure web testing you may need to adjust this path.
      img.src = (sheet.imageSource as any).uri ?? String(sheet.imageSource);
    } else if (typeof sheet.imageSource === "string") {
      img.src = sheet.imageSource;
    } else if (sheet.imageSource?.uri) {
      img.src = sheet.imageSource.uri;
    } else {
      // Last resort – assume it is already a usable source
      img.src = sheet.imageSource as any;
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

// ---------------------------------------------------------------------------
// Canvas drawer
// ---------------------------------------------------------------------------

export function drawSpriteCanvas(
  ctx: CanvasRenderingContext2D,
  animator: SpriteAnimatorComponent,
  x: number,
  y: number
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
  ctx.translate(x + ox, y + oy);

  if (animator.flipX) {
    ctx.scale(-1, 1);
    ctx.translate(-dw, 0);
  }

  // Draw centered on the feet / logical origin
  ctx.drawImage(
    img as CanvasImageSource,
    frame.x,
    frame.y,
    frame.w,
    frame.h,
    -dw / 2,
    -dh,          // feet at origin
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
  paint?: any
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

  // Source rect → dest rect (feet at origin)
  const src = { x: frame.x, y: frame.y, width: frame.w, height: frame.h };
  const dst = { x: -dw / 2, y: -dh, width: dw, height: dh };

  // Skia drawImageRect signature varies slightly by version; this is the common form
  canvas.drawImageRect(
    image,
    src as any,
    dst as any,
    paint ?? undefined
  );

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
