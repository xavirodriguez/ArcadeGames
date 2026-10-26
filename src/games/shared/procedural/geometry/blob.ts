/**
 * Multi-lobed organic blob / leaf silhouette generator.
 */
import type { Point2D, PolygonPrimitive } from "../types/ProceduralTypes";
import type { INoise } from "../noise/Noise";
import type { IPrng } from "../random/Prng";
import { poly } from "./poly";
import { loopNoise } from "../noise/Noise";

export interface BlobOptions {
  len?: number;
  wid?: number;
  ang?: number;
  col?: string;
  noi?: number;
  ret?: number; // 0: PolygonPrimitive, 1: Point2D[]
  fun?: (x: number) => number;
  prng?: IPrng;
  noise?: INoise;
}

export function blob(
  x: number,
  y: number,
  options?: BlobOptions
): PolygonPrimitive | Point2D[] {
  const len = options?.len ?? 20;
  const wid = options?.wid ?? 5;
  const ang = options?.ang ?? 0;
  const col = options?.col ?? "rgba(0,0,0,0.9)";
  const noi = options?.noi ?? 0.5;
  const ret = options?.ret ?? 0;
  const fun =
    options?.fun ??
    ((p: number) =>
      p <= 1
        ? Math.pow(Math.sin(p * Math.PI), 0.5)
        : -Math.pow(Math.sin((p + 1) * Math.PI), 0.5));

  const reso = 20.0;
  const lalist: Array<[number, number]> = [];
  for (let i = 0; i <= reso; i++) {
    const p = (i / reso) * 2;
    const xo = len / 2 - Math.abs(p - 1) * len;
    const yo = (fun(p) * wid) / 2;
    const a = Math.atan2(yo, xo);
    const l = Math.sqrt(xo * xo + yo * yo);
    lalist.push([l, a]);
  }

  const noiseVal = options?.noise;
  const n0 = options?.prng ? options.prng.next() * 10 : 2.345;

  let nslist: Point2D[] = [];
  for (let i = 0; i <= reso; i++) {
    const val = noiseVal ? noiseVal.noise(i * 0.05, n0) : 0.5;
    nslist.push({ x: i * 0.05, y: val });
  }

  if (noiseVal) {
    nslist = loopNoise(nslist, noiseVal);
  }

  const plist: Point2D[] = [];
  for (let i = 0; i < lalist.length; i++) {
    const ns = (nslist[i]?.y ?? 0.5) * noi + (1 - noi);
    const nx = x + Math.cos(lalist[i][1] + ang) * lalist[i][0] * ns;
    const ny = y + Math.sin(lalist[i][1] + ang) * lalist[i][0] * ns;
    plist.push({ x: nx, y: ny });
  }

  if (ret === 1) {
    return plist;
  }

  return poly(plist, { fil: col, str: col, wid: 0 });
}
