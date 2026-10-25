// src/games/shared/sprites/SpriteDrawer.ts
// ---------------------------------------------------------------------------
// Image cache (simple, shared between Canvas & Skia)
// ---------------------------------------------------------------------------
import { Asset } from "expo-asset";
import { getPaint } from "../rendering/SkiaContext";
import { Skia } from "@shopify/react-native-skia";
import type { SkCanvas, SkImage, SkPaint } from "@shopify/react-native-skia";
import { SpriteRegistry } from "./SpriteRegistry";
import { getCurrentFrameRect, SpriteAnimatorComponent } from "./SpriteAnimator";
import type { SpriteAnimatorComponent } from "./SpriteAnimator";
import type { SpriteSheetDef, SpriteFrameRect } from "./SpriteTypes";

const canvasImageCache = new Map<string, HTMLImageElement | HTMLCanvasElement>();
const canvasPendingLoads = new Map<string, Promise<void>>();
const skiaImageCache = new Map<string, SkImage>();
const skiaPendingLoads = new Map<string, Promise<void>>();
const canvasFailedLoads = new Set<string>();
const skiaFailedLoads = new Set<string>();

async function resolveImageUri(
  source: SpriteSheetDef["imageSource"],
  preferLocalUri = false
): Promise<string | undefined> {
  if (typeof source === "string") return source;

  if (typeof source === "number") {
    const asset = Asset.fromModule(source);
    await asset.downloadAsync();
    return preferLocalUri ? (asset.localUri ?? asset.uri) : (asset.uri ?? asset.localUri);
  }
  if (source === null) return undefined;

  return preferLocalUri
    ? (source?.localUri ?? source?.uri)
    : (source?.uri ?? source?.localUri);
}

function getCanvasImageSize(image: HTMLImageElement | HTMLCanvasElement): { width: number; height: number } {
  if ("naturalWidth" in image) {
    return { width: image.naturalWidth, height: image.naturalHeight };
  }
  return { width: image.width, height: image.height };
}

interface SkiaImageDimensions {
  width: number | (() => number);
  height: number | (() => number);
}

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
function getSkiaImageSize(image: SkImage): { width: number; height: number } {
  const dimensions = image as unknown as SkiaImageDimensions;
  const width = typeof dimensions.width === "function" ? dimensions.width() : dimensions.width;
  const height = typeof dimensions.height === "function" ? dimensions.height() : dimensions.height;
  return { width, height };
}

function resolveSourceRect(
  sheet: SpriteSheetDef,
  animator: SpriteAnimatorComponent,
  imageWidth: number,
  imageHeight: number
): SpriteFrameRect | null {
  if (sheet.sourceMode === "full-image") {
    return imageWidth > 0 && imageHeight > 0
      ? { x: 0, y: 0, w: imageWidth, h: imageHeight }
      : null;
  }
  return getCurrentFrameRect(animator);
}

function resolveDrawSize(
  sheet: SpriteSheetDef,
  frame: SpriteFrameRect,
  animator: SpriteAnimatorComponent
): { width: number; height: number } {
  if (sheet.sourceMode === "full-image") {
    const fitScale = Math.min(sheet.frameWidth / frame.w, sheet.frameHeight / frame.h);
    const scale = fitScale * animator.scale;
    return { width: frame.w * scale, height: frame.h * scale };
  }

  return {
    width: frame.w * animator.scale,
    height: frame.h * animator.scale,
  };
}

/** Load a sheet once for Canvas, sharing the pending request between entities. */
export function preloadSpriteSheetCanvas(sheetId: string): Promise<void> {
  const sheet = SpriteRegistry.get(sheetId);
  if (!sheet || canvasImageCache.has(sheetId) || canvasFailedLoads.has(sheetId)) {
    return Promise.resolve();
  }

  const pending = canvasPendingLoads.get(sheetId);
  if (pending) return pending;
  if (typeof Image === "undefined") return Promise.resolve();

  const load = (async () => {
    const uri = await resolveImageUri(sheet.imageSource);
    if (!uri) throw new Error(`No image URI available for sprite sheet "${sheetId}".`);

    await new Promise<void>((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        canvasImageCache.set(sheetId, img);
        resolve();
      };
      img.onerror = () => reject(new Error(`Failed to load sprite sheet "${sheetId}".`));
      img.src = uri;
    });
  })().catch((error: unknown) => {
    canvasFailedLoads.add(sheetId);
    throw error;
  }).finally(() => {
    canvasPendingLoads.delete(sheetId);
  });

  canvasPendingLoads.set(sheetId, load);
  return load;
}

/** Decode a bundled sheet into Skia's cache; drawing falls back while it loads. */
export function preloadSpriteSheetSkia(sheetId: string): Promise<void> {
  const sheet = SpriteRegistry.get(sheetId);
  if (!sheet || skiaImageCache.has(sheetId) || skiaFailedLoads.has(sheetId) || !Skia) {
    return Promise.resolve();
  }

  const pending = skiaPendingLoads.get(sheetId);
  if (pending) return pending;

  const load = (async () => {
    const uri = await resolveImageUri(sheet.imageSource, true);
    if (!uri) throw new Error(`No image URI available for sprite sheet "${sheetId}".`);

    const data = await Skia.Data.fromURI(uri);
    if (!data) throw new Error(`Failed to decode sprite sheet "${sheetId}".`);

    const image = Skia.Image.MakeImageFromEncoded(data);
    if (!image) throw new Error(`Failed to create Skia image for sprite sheet "${sheetId}".`);
    skiaImageCache.set(sheetId, image);
  })().catch((error: unknown) => {
    skiaFailedLoads.add(sheetId);
    throw error;
  }).finally(() => {
    skiaPendingLoads.delete(sheetId);
  });

  skiaPendingLoads.set(sheetId, load);
  return load;
}

/** Store a Skia image for a sheet (call after a custom useImage loader if needed). */
export function setSkiaImage(sheetId: string, image: SkImage | null): void {
  if (image) {
    skiaImageCache.set(sheetId, image);
    skiaFailedLoads.delete(sheetId);
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
  if (!sheet) return false;

  const img = canvasImageCache.get(animator.sheetId);
  if (!img) {
    void preloadSpriteSheetCanvas(animator.sheetId).catch(() => {});
    return false;
  }

  const imageSize = getCanvasImageSize(img);
  const frame = resolveSourceRect(sheet, animator, imageSize.width, imageSize.height);
  if (!frame || frame.w <= 0 || frame.h <= 0) return false;

  const { width: dw, height: dh } = resolveDrawSize(sheet, frame, animator);
  const ox = (animator.offsetX ?? 0) * animator.scale;
  const oy = (animator.offsetY ?? 0) * animator.scale;
  const anchor = sheet.anchor ?? { x: 0.5, y: 1 };

  ctx.save();
  ctx.globalAlpha *= (options?.opacity ?? 1);
  ctx.translate(x + ox, y + oy);
  if (animator.flipX) ctx.scale(-1, 1);

  if (animator.flipX) {
    ctx.scale(-1, 1);
    ctx.translate(-dw, 0);
  }

  // Logical anchor: feet (default) or centered on the position
  const dy = options?.anchor === "center" ? -dh / 2 : -dh;

  // Draw the frame at the chosen anchor
  ctx.drawImage(
    img,
    frame.x,
    frame.y,
    frame.w,
    frame.h,
    -dw * anchor.x,
    -dh * anchor.y,
    dw,
    dh
  );

  ctx.restore();
  return true;
}

export function drawSpriteSkia(
  canvas: SkCanvas,
  animator: SpriteAnimatorComponent,
  x: number,
  y: number,
  paint?: SkPaint,
  options?: SpriteDrawOptions
): void {
  const sheet = SpriteRegistry.get(animator.sheetId);
  if (!sheet) return false;

  const image = skiaImageCache.get(animator.sheetId);
  if (!image) {
    void preloadSpriteSheetSkia(animator.sheetId).catch(() => {});
    return false;
  }

  const imageSize = getSkiaImageSize(image);
  const frame = resolveSourceRect(sheet, animator, imageSize.width, imageSize.height);
  if (!frame || frame.w <= 0 || frame.h <= 0) return false;

  const { width: dw, height: dh } = resolveDrawSize(sheet, frame, animator);
  const ox = (animator.offsetX ?? 0) * animator.scale;
  const oy = (animator.offsetY ?? 0) * animator.scale;
  const anchor = sheet.anchor ?? { x: 0.5, y: 1 };

  canvas.save();
  canvas.translate(x + ox, y + oy);
  if (animator.flipX) canvas.scale(-1, 1);

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

  const src = { x: frame.x, y: frame.y, width: frame.w, height: frame.h };
  const dst = {
    x: -dw * anchor.x,
    y: -dh * anchor.y,
    width: dw,
    height: dh,
  };
  canvas.drawImageRect(image, src, dst, paint ?? undefined);
  canvas.restore();
  return true;
}

export function getSpriteLogicalSize(sheetId: string): { w: number; h: number } | null {
  const sheet = SpriteRegistry.get(sheetId);
  if (!sheet) return null;
  return { w: sheet.frameWidth, h: sheet.frameHeight };
}
