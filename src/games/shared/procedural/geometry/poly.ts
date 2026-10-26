/**
 * Polygon primitive builder. Converts raw 2D points with offsets and styles into PolygonPrimitive.
 */
import type { Point2D, PolygonPrimitive } from "../types/ProceduralTypes";

export interface PolyOptions {
  xof?: number;
  yof?: number;
  fil?: string;
  str?: string;
  wid?: number;
}

export function poly(plist: readonly Point2D[], options?: PolyOptions): PolygonPrimitive {
  const xof = options?.xof ?? 0;
  const yof = options?.yof ?? 0;
  const fill = options?.fil ?? "rgba(0,0,0,0)";
  const stroke = options?.str ?? fill;
  const strokeWidth = options?.wid ?? 0;

  const points: Point2D[] = plist.map(p => ({
    x: p.x + xof,
    y: p.y + yof
  }));

  return {
    type: "polygon",
    points,
    fill,
    stroke,
    strokeWidth
  };
}
