import type {
  ResolvedVisualInstance,
  ResolvedVisualRepeater,
  ResolvedVisualScene,
  VisualPoint
} from "./VisualCompositionTypes";
import { SpriteRegistry } from "../../sprites/SpriteRegistry";
import {
  drawSpriteCanvas,
  getCanvasSpriteLoadState,
  preloadSpriteSheetCanvas
} from "../../sprites/SpriteDrawer";
import type { SpriteAnimatorComponent } from "../../sprites/SpriteAnimator";
import {
  getVisibleRepeatedIndexRange,
  getVisualPosition,
  type VisualSceneCamera,
  type VisualSceneViewportOffset
} from "./VisualSceneTransform";

export type CanvasVisualSceneCamera = VisualSceneCamera;
export type CanvasVisualSceneOffset = VisualSceneViewportOffset;

/** Public compatibility helper; Canvas and Skia share the implementation. */
export function getCanvasVisualPosition(
  instance: Pick<ResolvedVisualInstance, "position" | "space" | "parallaxFactor">,
  camera: CanvasVisualSceneCamera,
  viewportOffset: CanvasVisualSceneOffset = { x: 0, y: 0 }
): VisualPoint {
  return getVisualPosition(instance, camera, viewportOffset);
}

function drawSprite(
  ctx: CanvasRenderingContext2D,
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
  ctx.save();
  ctx.translate(position.x, position.y);
  if (rotation !== 0) ctx.rotate(rotation);
  if (scaleX !== scaleY) ctx.scale(scaleX, scaleY);
  const drawn = drawSpriteCanvas(ctx, animator, 0, 0, {
    destinationAnchor: anchor,
    opacity
  });
  ctx.restore();
  return drawn && getCanvasSpriteLoadState(assetId) === "ready";
}

function drawInstance(
  ctx: CanvasRenderingContext2D,
  instance: ResolvedVisualInstance,
  camera: CanvasVisualSceneCamera,
  viewportOffset: CanvasVisualSceneOffset
): boolean {
  const point = getVisualPosition(instance, camera, viewportOffset);
  const zoom = instance.space === "screen" ? 1 : (camera.zoom ?? 1);
  return drawSprite(
    ctx,
    instance.asset,
    instance.anchor,
    point,
    instance.scale.x * zoom,
    instance.scale.y * zoom,
    instance.rotation,
    instance.flipX,
    instance.opacity
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
  ctx: CanvasRenderingContext2D,
  repeater: ResolvedVisualRepeater,
  camera: CanvasVisualSceneCamera,
  viewportOffset: CanvasVisualSceneOffset,
  viewportWidth: number
): boolean {
  if (repeater.assets.length === 0) return false;
  const range = getVisibleRepeatedIndexRange(repeater, camera, viewportWidth, viewportOffset, repeater.spacing);
  if (range.lastIndex < range.firstIndex) return true;

  let complete = true;
  const salt = stableSalt(repeater.id, repeater.assets.length);
  for (let index = range.firstIndex; index <= range.lastIndex; index++) {
    const selected = repeater.assets[positiveModulo(index + salt, repeater.assets.length)];
    const point = getVisualPosition({
      position: { x: repeater.start.x + index * repeater.spacing, y: repeater.start.y },
      space: repeater.space,
      parallaxFactor: repeater.parallaxFactor
    }, camera, viewportOffset);
    const zoom = repeater.space === "screen" ? 1 : (camera.zoom ?? 1);
    if (!drawSprite(
      ctx, selected.id, selected.anchor, point,
      repeater.scale.x * zoom, repeater.scale.y * zoom, 0, false, repeater.opacity
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

/** Draw a resolved scene without owning caches or ECS state. */
export function drawResolvedVisualSceneCanvas(
  ctx: CanvasRenderingContext2D,
  scene: ResolvedVisualScene,
  camera: CanvasVisualSceneCamera,
  viewportOffset: CanvasVisualSceneOffset = { x: 0, y: 0 },
  viewportSize: { readonly width: number; readonly height: number } = {
    width: ctx.canvas.width,
    height: ctx.canvas.height
  }
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
      if (!drawRepeater(ctx, repeater, camera, viewportOffset, viewportSize.width)) complete = false;
      repeaterIndex++;
    } else if (instance) {
      if (!drawInstance(ctx, instance, camera, viewportOffset)) complete = false;
      instanceIndex++;
    }
  }
  return complete;
}

/** Preload static and repeated-scene assets through the shared Canvas cache. */
export async function preloadResolvedVisualSceneCanvas(scene: ResolvedVisualScene): Promise<void> {
  const ids = new Set<string>();
  for (const instance of scene.instances) ids.add(instance.asset);
  for (const repeater of scene.repeaters ?? []) {
    for (const asset of repeater.assets) ids.add(asset.id);
  }
  await Promise.all([...ids].map(async id => {
    if (SpriteRegistry.has(id)) await preloadSpriteSheetCanvas(id);
  }));
}
