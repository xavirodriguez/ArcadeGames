export type HUDAnchor =
  | "top-left"
  | "top-center"
  | "top-right"
  | "center-left"
  | "center"
  | "center-right"
  | "bottom-left"
  | "bottom-center"
  | "bottom-right";

export interface Vector2D {
  x: number;
  y: number;
}

export interface AnchorOffset {
  x?: number;
  y?: number;
}

/**
 * Calculates a 2D position based on semantic viewport anchors and safe margins.
 * Eliminates hardcoded absolute pixel coordinates in Canvas and Skia HUD drawers.
 */
export function getHUDAnchorPosition(
  anchor: HUDAnchor,
  viewportWidth: number,
  viewportHeight: number,
  offset: AnchorOffset = { x: 0, y: 0 }
): Vector2D {
  const offsetX = offset.x ?? 0;
  const offsetY = offset.y ?? 0;

  switch (anchor) {
    case "top-left":
      return { x: offsetX, y: offsetY };
    case "top-center":
      return { x: viewportWidth / 2 + offsetX, y: offsetY };
    case "top-right":
      return { x: viewportWidth + offsetX, y: offsetY };
    case "center-left":
      return { x: offsetX, y: viewportHeight / 2 + offsetY };
    case "center":
      return { x: viewportWidth / 2 + offsetX, y: viewportHeight / 2 + offsetY };
    case "center-right":
      return { x: viewportWidth + offsetX, y: viewportHeight / 2 + offsetY };
    case "bottom-left":
      return { x: offsetX, y: viewportHeight + offsetY };
    case "bottom-center":
      return { x: viewportWidth / 2 + offsetX, y: viewportHeight + offsetY };
    case "bottom-right":
      return { x: viewportWidth + offsetX, y: viewportHeight + offsetY };
    default:
      return { x: offsetX, y: offsetY };
  }
}
