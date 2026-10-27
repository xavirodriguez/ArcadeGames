// src/games/shared/sprites/SpriteDrawer.ts
// ---------------------------------------------------------------------------
// Image cache (simple, shared between Canvas & Skia)
// ---------------------------------------------------------------------------
import type { Asset as ExpoAssetType } from "expo-asset";
import { calculateSpriteDestinationRect } from "@tiny-aster/core";
import { getPaint, Skia } from "../rendering/SkiaContext";
import type { SkCanvas, SkImage, SkPaint } from "@shopify/react-native-skia";

let ExpoAsset: any = null;
try {
  ExpoAsset = require("expo-asset").Asset;
} catch {
  ExpoAsset = null;
}
import { SpriteRegistry } from "./SpriteRegistry";
import { getCurrentFrameRect } from "./SpriteAnimator";
import type { SpriteAnimatorComponent } from "./SpriteAnimator";
import type { SpriteSheetDef, SpriteFrameRect } from "./SpriteTypes";

/**
 * Lazily loads the expo-asset module. Kept out of the static imports so
 * headless / test environments (no Metro asset registry) never crash on load:
 * resolveImageUri callers all early-return before touching the asset registry.
 */
function loadExpoAssetClass(): (typeof import("expo-asset"))["Asset"] | undefined {
  try {
    return (require("expo-asset") as typeof import("expo-asset")).Asset;
  } catch {
    return undefined;
  }
}


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
    const AssetClass = loadExpoAssetClass() as (typeof ExpoAssetType) | undefined;
    if (!AssetClass) return undefined;
    const asset = AssetClass.fromModule(source);
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

function getSkiaImageSize(image: SkImage): { width: number; height: number } {
  const dimensions = image as SkiaImageDimensions;
  const width = typeof dimensions.width === "function" ? dimensions.width() : dimensions.width;
  const height = typeof dimensions.height === "function" ? dimensions.height() : dimensions.height;
  return { width, height };
}

/** Resolves which source pixels a frame occupies (full-image sheets or frame grids). */
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

/** Resolves the logical draw size of a frame in world units. */
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

/**
 * Shared draw options accepted by the Canvas and Skia sprite drawers.
 */
export interface SpriteDrawOptions {
  /** Logical anchor of `y`: "feet" (default, frame drawn above y) or "center" (frame centered on y). */
  anchor?: "feet" | "center";
  /** Additional alpha multiplier (0..1). Defaults to 1. */
  opacity?: number;
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

/** Whether the Canvas image for a sheet already finished loading. */
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
): boolean {
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
  const destination = calculateSpriteDestinationRect(dw, dh, {
    x: anchor.x,
    y: options?.anchor === "center" ? 0.5 : anchor.y
  });
  if (!destination) return false;

  ctx.save();
  ctx.globalAlpha *= Math.max(0, Math.min(1, options?.opacity ?? 1));
  ctx.translate(x + ox, y + oy);
  if (animator.flipX) {
    ctx.scale(-1, 1);
  }

  ctx.drawImage(
    img,
    frame.x,
    frame.y,
    frame.w,
    frame.h,
    destination.x,
    destination.y,
    destination.width,
    destination.height
  );

  ctx.restore();
  return true;
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
): boolean {
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
  const destination = calculateSpriteDestinationRect(dw, dh, {
    x: anchor.x,
    y: options?.anchor === "center" ? 0.5 : anchor.y
  });
  if (!destination) return false;

  canvas.save();
  canvas.translate(x + ox, y + oy);
  if (animator.flipX) canvas.scale(-1, 1);

  const usingCallerPaint = paint !== undefined;
  const paintToUse = paint ?? getPaint();
  paintToUse.setAlphaf(Math.max(0, Math.min(1, options?.opacity ?? 1)));

  const src = { x: frame.x, y: frame.y, width: frame.w, height: frame.h };
  const dst = {
    x: destination.x,
    y: destination.y,
    width: destination.width,
    height: destination.height
  };

  canvas.drawImageRect(image, src, dst, paintToUse);

  canvas.restore();

  if (!usingCallerPaint) paintToUse.setAlphaf(1);

  return true;
}

export function getSpriteLogicalSize(sheetId: string): { w: number; h: number } | null {
  const sheet = SpriteRegistry.get(sheetId);
  if (!sheet) return null;
  return { w: sheet.frameWidth, h: sheet.frameHeight };
}
