/**
 * PixelFX Integration Layer — Export metadata adapter
 *
 * Pivot → normalized anchor:
 *   anchor.x = pivot.x / frameWidth
 *   anchor.y = pivot.y / frameHeight
 */

export interface PixelFXExportFrame {
  frame: { x: number; y: number; w: number; h: number };
  duration?: number;
}

export interface PixelFXExportMeta {
  size?: { w: number; h: number };
  frameTags?: Array<{ name: string; from: number; to: number; direction?: string }>;
  pixelfx?: {
    id?: string;
    name?: string;
    fps?: number;
    loop?: boolean;
    frames?: number;
    frameSize?: [number, number];
    columns?: number;
    pivot?: [number, number] | { x: number; y: number };
    act?: unknown;
  };
}

export interface PixelFXExportJson {
  frames: Record<string, PixelFXExportFrame> | PixelFXExportFrame[];
  meta: PixelFXExportMeta;
}

export interface AdaptedSpriteSheetMeta {
  id: string;
  imagePath: string;
  frameWidth: number;
  frameHeight: number;
  frameDuration: number;
  loop: boolean;
  anchor: { x: number; y: number };
  frames: Array<{ x: number; y: number; w: number; h: number }>;
  actTiming?: unknown;
  origin: string;
  filter: "nearest";
}

export function adaptPixelFXExport(
  sheetId: string,
  imagePath: string,
  json: PixelFXExportJson,
  originTag: string
): AdaptedSpriteSheetMeta {
  const framesRaw = Array.isArray(json.frames)
    ? json.frames
    : Object.values(json.frames);

  if (framesRaw.length === 0) {
    throw new Error(`adaptPixelFXExport: no frames for ${sheetId}`);
  }

  const first = framesRaw[0].frame;
  const frameWidth = first.w;
  const frameHeight = first.h;

  const fps = json.meta.pixelfx?.fps ?? 12;
  const frameDuration = 1 / fps;
  const loop = json.meta.pixelfx?.loop ?? false;

  const rawPivot = json.meta.pixelfx?.pivot;
  let pivotX: number;
  let pivotY: number;
  if (Array.isArray(rawPivot) && rawPivot.length >= 2) {
    pivotX = rawPivot[0];
    pivotY = rawPivot[1];
  } else if (rawPivot && typeof rawPivot === "object" && "x" in rawPivot) {
    pivotX = (rawPivot as { x: number; y: number }).x;
    pivotY = (rawPivot as { x: number; y: number }).y;
  } else {
    pivotX = frameWidth / 2;
    pivotY = frameHeight / 2;
  }

  const anchor = {
    x: pivotX / frameWidth,
    y: pivotY / frameHeight,
  };

  const frames = framesRaw.map((f) => ({
    x: f.frame.x,
    y: f.frame.y,
    w: f.frame.w,
    h: f.frame.h,
  }));

  return {
    id: sheetId,
    imagePath,
    frameWidth,
    frameHeight,
    frameDuration,
    loop,
    anchor,
    frames,
    actTiming: json.meta.pixelfx?.act,
    origin: originTag,
    filter: "nearest",
  };
}

export function clipDurationSeconds(meta: AdaptedSpriteSheetMeta): number {
  return meta.frames.length * meta.frameDuration;
}
