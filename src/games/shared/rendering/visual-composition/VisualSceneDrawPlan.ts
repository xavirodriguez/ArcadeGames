import type {
  ResolvedVisualInstance,
  ResolvedVisualRepeater,
  ResolvedVisualScene,
  VisualAnchorPoint,
  VisualPoint
} from "./VisualCompositionTypes";
import { getVisibleRepeatedIndexRange, getVisualPosition, type VisualSceneCamera, type VisualSceneViewportOffset } from "./VisualSceneTransform";

export interface VisualSceneDrawItem {
  readonly assetId: string;
  readonly anchor: VisualAnchorPoint;
  readonly position: VisualPoint;
  readonly scaleX: number;
  readonly scaleY: number;
  readonly rotation: number;
  readonly flipX: boolean;
  readonly opacity: number;
}
export type VisualSceneDrawVisitor = (item: VisualSceneDrawItem) => boolean;

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
function repeaterPrecedesInstance(
  repeater: ResolvedVisualRepeater,
  instance: ResolvedVisualInstance
): boolean {
  if (repeater.layerOrder !== instance.layerOrder) return repeater.layerOrder < instance.layerOrder;
  if (repeater.layerId !== instance.layerId) return repeater.layerId < instance.layerId;
  return false;
}

/**
 * Walk the visible draw plan once for either backend. It shares layer ordering,
 * repeat-index selection, camera transforms, overscan and visual properties.
 * The visitor performs only backend-specific drawing and returns readiness.
 */
export function forEachVisualSceneDrawItem(
  scene: ResolvedVisualScene,
  camera: VisualSceneCamera,
  viewportOffset: VisualSceneViewportOffset,
  viewportWidth: number,
  visit: VisualSceneDrawVisitor
): boolean {
  const instances = scene.instances;
  const repeaters = scene.repeaters ?? [];
  let instanceIndex = 0;
  let repeaterIndex = 0;
  let complete = true;

  const drawInstance = (instance: ResolvedVisualInstance): void => {
    const position = getVisualPosition(instance, camera, viewportOffset);
    const zoom = instance.space === "screen" ? 1 : (camera.zoom ?? 1);
    if (!visit({
      assetId: instance.asset,
      anchor: instance.anchor,
      position,
      scaleX: instance.scale.x * zoom,
      scaleY: instance.scale.y * zoom,
      rotation: instance.rotation,
      flipX: instance.flipX,
      opacity: instance.opacity
    })) complete = false;
  };

  const drawRepeater = (repeater: ResolvedVisualRepeater): void => {
    if (repeater.assets.length === 0) {
      complete = false;
      return;
    }
    const range = getVisibleRepeatedIndexRange(
      repeater, camera, viewportWidth, viewportOffset, repeater.spacing
    );
    const salt = stableSalt(repeater.id, repeater.assets.length);
    const zoom = repeater.space === "screen" ? 1 : (camera.zoom ?? 1);
    for (let index = range.firstIndex; index <= range.lastIndex; index++) {
      const asset = repeater.assets[positiveModulo(index + salt, repeater.assets.length)];
      const position = getVisualPosition({
        position: { x: repeater.start.x + index * repeater.spacing, y: repeater.start.y },
        space: repeater.space,
        parallaxFactor: repeater.parallaxFactor
      }, camera, viewportOffset);
      if (!visit({
        assetId: asset.id,
        anchor: asset.anchor,
        position,
        scaleX: repeater.scale.x * zoom,
        scaleY: repeater.scale.y * zoom,
        rotation: 0,
        flipX: false,
        opacity: repeater.opacity
      })) complete = false;
    }
  };

  while (instanceIndex < instances.length || repeaterIndex < repeaters.length) {
    const instance = instances[instanceIndex];
    const repeater = repeaters[repeaterIndex];
    if (repeater && (!instance || repeaterPrecedesInstance(repeater, instance))) {
      drawRepeater(repeater);
      repeaterIndex++;
    } else if (instance) {
      drawInstance(instance);
      instanceIndex++;
    }
  }
  return complete;
}

/** Unique assets needed by both static instances and repeated rows, in stable order. */
export function getVisualSceneAssetIds(scene: ResolvedVisualScene): string[] {
  const ids = new Set<string>();
  for (const instance of scene.instances) ids.add(instance.asset);
  for (const repeater of scene.repeaters ?? []) {
    for (const asset of repeater.assets) ids.add(asset.id);
  }
  return [...ids];
}
