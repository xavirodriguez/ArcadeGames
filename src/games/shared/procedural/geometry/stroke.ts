/**
 * Variable-width stroke contour generator.
 * Converts a centerline path into an organic polygon contour.
 */
import type { Point2D, PolygonPrimitive } from "../types/ProceduralTypes";
import type { INoise } from "../noise/Noise";
import type { IPrng } from "../random/Prng";
import { poly } from "./poly";

export interface StrokeOptions {
  xof?: number;
  yof?: number;
  wid?: number;
  col?: string;
  noi?: number;
  out?: number;
  fun?: (x: number) => number;
  prng?: IPrng;
  noise?: INoise;
  ret?: number; // 0: PolygonPrimitive, 1: raw Point2D[]
}

export function stroke(
  ptlist: readonly Point2D[],
  options?: StrokeOptions
): PolygonPrimitive | Point2D[] {
  if (ptlist.length < 2) {
    if (options?.ret === 1) return [];
    return poly([], { fil: options?.col ?? "rgba(0,0,0,1)" });
  }

  const xof = options?.xof ?? 0;
  const yof = options?.yof ?? 0;
  const wid = options?.wid ?? 2;
  const col = options?.col ?? "rgba(0,0,0,0.9)";
  const noi = options?.noi ?? 0.5;
  const fun = options?.fun ?? ((x: number) => Math.sin(x * Math.PI));

  const noiseVal = options?.noise;
  const n0 = options?.prng ? options.prng.next() * 10 : 1.234;

  const vtxlist0: Point2D[] = [];
  const vtxlist1: Point2D[] = [];

  for (let i = 1; i < ptlist.length - 1; i++) {
    let w = wid * fun(i / ptlist.length);
    const noiseFactor = noiseVal ? noiseVal.noise(i * 0.5, n0) : 0.5;
    w = w * (1 - noi) + w * noi * noiseFactor;

    const a1 = Math.atan2(ptlist[i].y - ptlist[i - 1].y, ptlist[i].x - ptlist[i - 1].x);
    const a2 = Math.atan2(ptlist[i].y - ptlist[i + 1].y, ptlist[i].x - ptlist[i + 1].x);
    let a = (a1 + a2) / 2;
    if (a < a2) {
      a += Math.PI;
    }

    vtxlist0.push({
      x: ptlist[i].x + w * Math.cos(a),
      y: ptlist[i].y + w * Math.sin(a)
    });
    vtxlist1.push({
      x: ptlist[i].x - w * Math.cos(a),
      y: ptlist[i].y - w * Math.sin(a)
    });
  }

  const vtxlist: Point2D[] = [
    ptlist[0],
    ...vtxlist0,
    ...vtxlist1.concat([ptlist[ptlist.length - 1]]).reverse()
  ];

  if (options?.ret === 1) {
    return vtxlist.map(p => ({ x: p.x + xof, y: p.y + yof }));
  }

  return poly(vtxlist, { xof, yof, fil: col, str: col, wid: 0 });
}
