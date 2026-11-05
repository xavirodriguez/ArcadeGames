/**
 * Renderer-neutral solid backdrop painter for Hit & Run themes.
 * Uses IDrawAdapter so Canvas and Skia share one implementation.
 */

import type { IDrawAdapter } from "../../../shared/rendering/DrawAdapter";
import { CanvasDrawAdapter, SkiaDrawAdapter } from "../../../shared/rendering/DrawAdapter";
import type { SkCanvas } from "@shopify/react-native-skia";

/**
 * Fill the full viewport with a solid background color via a neutral adapter.
 * Suitable for template / minimal themes; richer themes keep dedicated painters.
 */
export function paintSolidBackdrop(
  adapter: IDrawAdapter,
  viewportWidth: number,
  viewportHeight: number,
  backgroundColor: string
): void {
  adapter.fillRect(0, 0, viewportWidth, viewportHeight, backgroundColor, 1);
}

/** Canvas entry: wrap ctx and paint solid backdrop. */
export function paintSolidBackdropCanvas(
  ctx: CanvasRenderingContext2D,
  viewportWidth: number,
  viewportHeight: number,
  backgroundColor: string
): void {
  paintSolidBackdrop(new CanvasDrawAdapter(ctx), viewportWidth, viewportHeight, backgroundColor);
}

/** Skia entry: wrap canvas and paint solid backdrop. */
export function paintSolidBackdropSkia(
  canvas: SkCanvas,
  viewportWidth: number,
  viewportHeight: number,
  backgroundColor: string
): void {
  paintSolidBackdrop(new SkiaDrawAdapter(canvas as never), viewportWidth, viewportHeight, backgroundColor);
}
