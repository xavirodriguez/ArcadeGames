import type {
  ResolvedVisualRepeater,
  VisualCoordinateSpace,
  VisualPoint
} from "./VisualCompositionTypes";

export interface VisualSceneCamera {
  readonly x: number;
  readonly y: number;
  readonly zoom?: number;
  readonly visualOffsetX?: number;
  readonly visualOffsetY?: number;
}
export interface VisualSceneViewportOffset {
  readonly x: number;
  readonly y: number;
}
export interface VisualScenePositionInput {
  readonly position: Readonly<VisualPoint>;
  readonly space: VisualCoordinateSpace;
  readonly parallaxFactor?: number;
}
export interface RepeatedIndexRange {
  readonly firstIndex: number;
  readonly lastIndex: number;
}

export function getVisualCameraFactor(space: VisualCoordinateSpace, parallaxFactor?: number): number {
  if (space === "screen") return 0;
  if (space === "world") return 1;
  return parallaxFactor ?? 0;
}

/** Convert logical scene coordinates into viewport pixels using one shared camera contract. */
export function getVisualPosition(
  instance: VisualScenePositionInput,
  camera: VisualSceneCamera,
  viewportOffset: VisualSceneViewportOffset = { x: 0, y: 0 }
): VisualPoint {
  const zoom = camera.zoom ?? 1;
  const offsetX = (camera.visualOffsetX ?? 0) + viewportOffset.x;
  const offsetY = (camera.visualOffsetY ?? 0) + viewportOffset.y;
  if (instance.space === "screen") {
    return { x: instance.position.x + offsetX, y: instance.position.y + offsetY };
  }
  const factor = getVisualCameraFactor(instance.space, instance.parallaxFactor);
  return {
    x: (instance.position.x - camera.x * factor) * zoom + offsetX,
    y: (instance.position.y - camera.y * factor) * zoom + offsetY
  };
}

/** Return only repeat indices that can intersect the viewport, with a configurable overscan margin. */
export function getVisibleRepeatedIndexRange(
  repeater: Pick<ResolvedVisualRepeater, "space" | "parallaxFactor" | "start" | "spacing">,
  camera: VisualSceneCamera,
  viewportWidth: number,
  viewportOffset: VisualSceneViewportOffset = { x: 0, y: 0 },
  margin = 0
): RepeatedIndexRange {
  const zoom = camera.zoom ?? 1;
  if (!Number.isFinite(zoom) || zoom <= 0 || !Number.isFinite(viewportWidth) || viewportWidth < 0 ||
      !Number.isFinite(repeater.spacing) || repeater.spacing <= 0) {
    return { firstIndex: 0, lastIndex: -1 };
  }

  const offsetX = (camera.visualOffsetX ?? 0) + viewportOffset.x;
  const left = -Math.max(0, margin);
  const right = viewportWidth + Math.max(0, margin);

  if (repeater.space === "screen") {
    return {
      firstIndex: Math.ceil((left - offsetX - repeater.start.x) / repeater.spacing),
      lastIndex: Math.floor((right - offsetX - repeater.start.x) / repeater.spacing)
    };
  }

  const factor = getVisualCameraFactor(repeater.space, repeater.parallaxFactor);
  const cameraWorldX = camera.x * factor;
  const firstWorldX = (left - offsetX) / zoom + cameraWorldX;
  const lastWorldX = (right - offsetX) / zoom + cameraWorldX;
  return {
    firstIndex: Math.ceil((firstWorldX - repeater.start.x) / repeater.spacing),
    lastIndex: Math.floor((lastWorldX - repeater.start.x) / repeater.spacing)
  };
}
