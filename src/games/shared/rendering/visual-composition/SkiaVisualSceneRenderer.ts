import type { SkCanvas, SkPaint } from "@shopify/react-native-skia";
import type {
  ResolvedVisualInstance,
  ResolvedVisualRepeater,
  ResolvedVisualScene,
  VisualPoint
} from "./VisualCompositionTypes";
import { SpriteRegistry } from "../../sprites/SpriteRegistry";
import {
  drawSpriteSkia,
  getSkiaSpriteLoadState,
  preloadSpriteSheetSkia
} from "../../sprites/SpriteDrawer";
import type { SpriteAnimatorComponent } from "../../sprites/SpriteAnimator";
import {
  getVisibleRepeatedIndexRange,
  getVisualPosition,
  type VisualSceneCamera,
  type VisualSceneViewportOffset
} from "./VisualSceneTransform";

export type SkiaVisualSceneCamera = VisualSceneCamera;
export type SkiaVisualSceneOffset = VisualSceneViewportOffset;

function drawSprite(
  canvas: SkCanvas,
  paint: SkPaint | undefined,
  assetId: string,
  anchor: { readonly x: number; readonly y: number },
  position: VisualPoint,
  scaleX: number,
  scaleY: number,
  rotation: number,
  flipX: boolean,
  opacity: number
): boolean {
  if (!SpriteRegistry.has(assetId)) return false;
  const scale = scaleX === scaleY ? scaleX : 1;
  const animator: SpriteAnimatorComponent = {
    sheetId: assetId,
    currentAnim: "idle",
    frameIndex: 0,
    timer: 0,
    flipX,
    scale
  };
  canvas.save();
  canvas.translate(position.x, position.y);
  if (rotation !== 0) canvas.rotate(rotation * 180 / Math.PI);
  if (scaleX !== scaleY) canvas.scale(scaleX, scaleY);
  const drawn = drawSpriteSkia(canvas, animator, 0, 0, paint, {
    destinationAnchor: anchor,
    opacity
  });
  canvas.restore();
  return drawn && getSkiaSpriteLoadState(assetId) === "ready";
}

function drawInstance(
  canvas: SkCanvas,
  paint: SkPaint | undefined,
  instance: ResolvedVisualInstance,
  camera: SkiaVisualSceneCamera,
  viewportOffset: SkiaVisualSceneOffset
): boolean {
  const point = getVisualPosition(instance, camera, viewportOffset);
  const zoom = instance.space === "screen" ? 1 : (camera.zoom ?? 1);
  return drawSprite(
    canvas, paint, instance.asset, instance.anchor, point,
    instance.scale.x * zoom, instance.scale.y * zoom,
    instance.rotation, instance.flipX, instance.opacity
  );
}

function positiveModulo(value: number, modulus: number): number {
  return ((value % modulus) + modulus) % modulus;
}
function stableSalt(id: string, count: number): number {
  let hash = 2166136261;
  for (let index = 0; index < id.length; index++) {
    hash ^= id.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return positiveModulo(hash, count);
}
function drawRepeater(
  canvas: SkCanvas,
  paint: SkPaint | undefined,
  repeater: ResolvedVisualRepeater,
  camera: SkiaVisualSceneCamera,
  viewportOffset: SkiaVisualSceneOffset,
  viewportWidth: number
): boolean {
  if (repeater.assets.length === 0) return false;
  const range = getVisibleRepeatedIndexRange(repeater, camera, viewportWidth, viewportOffset, repeater.spacing);
  if (range.lastIndex < range.firstIndex) return true;
  let complete = true;
  const salt = stableSalt(repeater.id, repeater.assets.length);
  for (let index = range.firstIndex; index <= range.lastIndex; index++) {
    const asset = repeater.assets[positiveModulo(index + salt, repeater.assets.length)];
    const point = getVisualPosition({
      position: { x: repeater.start.x + index * repeater.spacing, y: repeater.start.y },
      space: repeater.space,
      parallaxFactor: repeater.parallaxFactor
    }, camera, viewportOffset);
    const zoom = repeater.space === "screen" ? 1 : (camera.zoom ?? 1);
    if (!drawSprite(
      canvas, paint, asset.id, asset.anchor, point,
      repeater.scale.x * zoom, repeater.scale.y * zoom,
      0, false, repeater.opacity
    )) complete = false;
  }
  return complete;
}
function repeaterPrecedesInstance(
  repeater: ResolvedVisualRepeater,
  instance: ResolvedVisualInstance
): boolean {
  if (repeater.layerOrder !== instance.layerOrder) return repeater.layerOrder < instance.layerOrder;
  if (repeater.layerId !== instance.layerId) return repeater.layerId < instance.layerId;
  return false;
}

/** Native Skia consumer of the same resolved scene and shared transform contract as Canvas. */
export function drawResolvedVisualSceneSkia(
  canvas: SkCanvas,
  scene: ResolvedVisualScene,
  camera: SkiaVisualSceneCamera,
  viewportWidth: number,
  viewportHeight: number,
  viewportOffset: SkiaVisualSceneOffset = { x: 0, y: 0 },
  paint?: SkPaint
): boolean {
  const instances = scene.instances;
  const repeaters = scene.repeaters ?? [];
  let instanceIndex = 0;
  let repeaterIndex = 0;
  let complete = true;
  while (instanceIndex < instances.length || repeaterIndex < repeaters.length) {
    const instance = instances[instanceIndex];
    const repeater = repeaters[repeaterIndex];
    if (repeater && (!instance || repeaterPrecedesInstance(repeater, instance))) {
      if (!drawRepeater(canvas, paint, repeater, camera, viewportOffset, viewportWidth)) complete = false;
      repeaterIndex++;
    } else if (instance) {
      if (!drawInstance(canvas, paint, instance, camera, viewportOffset)) complete = false;
      instanceIndex++;
    }
  }
  // Keep viewportHeight in this API so call sites pass the same logical viewport contract.
  void viewportHeight;
  return complete;
}

/** Preload static and repeated-scene assets into Skia's existing image cache. */
export async function preloadResolvedVisualSceneSkia(scene: ResolvedVisualScene): Promise<void> {
  const ids = new Set<string>();
  for (const instance of scene.instances) ids.add(instance.asset);
  for (const repeater of scene.repeaters ?? []) {
    for (const asset of repeater.assets) ids.add(asset.id);
  }
  await Promise.all([...ids].map(async id => {
    if (SpriteRegistry.has(id)) await preloadSpriteSheetSkia(id);
  }));
}
