/**
 * Terrain Generators: Mountain ridges, flat plateaus, distant haze silhouettes, rocks, and vegetation placement.
 * Adapted from Shan Shui (index(1).html) for renderer-decoupled vector primitives and deterministic execution.
 */
import type { Point2D, ScenePrimitive } from "../../types/ProceduralTypes";
import type { IPrng } from "../../random/Prng";
import type { INoise } from "../../noise/Noise";
import { Prng } from "../../random/Prng";
import { Noise } from "../../noise/Noise";
import { poly } from "../../geometry/poly";
import { stroke } from "../../geometry/stroke";
import { shatter } from "../../geometry/PolyTools";
import { normRand } from "../../random/distributions";
import { mountainCol, fog, stone } from "../../colors/ProceduralPalettes";
import { tree01, tree02, type TreeOptions } from "../vegetation/TreeGenerator";

export interface TerrainOptions {
  hei?: number;
  wid?: number;
  tex?: number;
  veg?: boolean;
  sha?: number;
  prng?: IPrng;
  noise?: INoise;
}

export function vegetate(
  ptlist: readonly Point2D[][],
  prng: IPrng,
  options?: {
    growthRule?: (pt: Point2D) => boolean;
    treeFn?: (x: number, y: number, options?: TreeOptions) => ScenePrimitive[];
  }
): ScenePrimitive[] {
  const primitives: ScenePrimitive[] = [];
  const growthRule = options?.growthRule ?? (() => true);
  const treeFn = options?.treeFn ?? tree01;

  for (let i = 0; i < ptlist.length; i++) {
    for (let j = 0; j < ptlist[i].length; j++) {
      const pt = ptlist[i][j];
      if (growthRule(pt)) {
        primitives.push(...treeFn(pt.x, pt.y, { prng }));
      }
    }
  }

  return primitives;
}

export function rock(
  xoff: number,
  yoff: number,
  seed = 0,
  options?: TerrainOptions
): ScenePrimitive[] {
  const prng = options?.prng ?? new Prng(seed + xoff + yoff);
  const hei = options?.hei ?? normRand(15, 35, prng);
  const wid = options?.wid ?? normRand(20, 40, prng);
  const sha = options?.sha ?? 2;

  const primitives: ScenePrimitive[] = [];
  const basePolygon: Point2D[] = [
    { x: xoff - wid * 0.5, y: yoff },
    { x: xoff - wid * 0.3, y: yoff - hei },
    { x: xoff + wid * 0.3, y: yoff - hei * 0.8 },
    { x: xoff + wid * 0.5, y: yoff }
  ];

  const frags = shatter(basePolygon, Math.max(10, (hei * wid) / (sha * 10)));
  frags.forEach((frag, idx) => {
    const col = stone((idx % 4) / 4, 0.8, prng);
    primitives.push(poly(frag, { fil: col, str: col, wid: 1 }));
  });

  return primitives;
}

export function mountain(
  xoff: number,
  yoff: number,
  seed = 0,
  options?: TerrainOptions
): ScenePrimitive[] {
  const prng = options?.prng ?? new Prng(seed + xoff * 10 + yoff);
  const noise = options?.noise ?? new Noise(prng);
  const hei = options?.hei ?? normRand(120, 300, prng);
  const wid = options?.wid ?? normRand(350, 550, prng);
  const veg = options?.veg ?? true;

  const primitives: ScenePrimitive[] = [];
  const ptlist: Point2D[] = [];
  const step = 20;

  for (let x = -wid / 2; x <= wid / 2; x += step) {
    const normX = (x + wid / 2) / wid;
    const shape = Math.sin(normX * Math.PI);
    const n = noise.noise((xoff + x) * 0.005, yoff * 0.005);
    const y = yoff - shape * hei * (0.5 + n * 0.8);
    ptlist.push({ x: xoff + x, y });
  }

  const fullPolyPts: Point2D[] = [
    { x: xoff - wid / 2, y: yoff + 100 },
    ...ptlist,
    { x: xoff + wid / 2, y: yoff + 100 }
  ];

  const col = mountainCol(0.5, yoff, undefined, prng);
  primitives.push(poly(fullPolyPts, { fil: col, str: col, wid: 0 }));

  const ridgeStroke = stroke(ptlist, { wid: 2, col: fog(0.8, 0.3, prng), prng, noise });
  if (!Array.isArray(ridgeStroke)) primitives.push(ridgeStroke);

  if (veg) {
    for (let i = 1; i < ptlist.length - 1; i += 3) {
      if (prng.next() < 0.4) {
        const treeFn = prng.next() < 0.5 ? tree01 : tree02;
        primitives.push(...treeFn(ptlist[i].x, ptlist[i].y, { hei: 20, wid: 3, prng, noise }));
      }
    }
  }

  return primitives;
}

export function flatMount(
  xoff: number,
  yoff: number,
  seed = 0,
  options?: TerrainOptions
): ScenePrimitive[] {
  const prng = options?.prng ?? new Prng(seed + xoff + yoff * 2);
  const noise = options?.noise ?? new Noise(prng);
  const hei = options?.hei ?? normRand(60, 150, prng);
  const wid = options?.wid ?? normRand(300, 500, prng);

  const primitives: ScenePrimitive[] = [];
  const pts: Point2D[] = [
    { x: xoff - wid / 2, y: yoff + 50 },
    { x: xoff - wid / 2, y: yoff - hei * 0.8 },
    { x: xoff - wid / 4, y: yoff - hei },
    { x: xoff + wid / 4, y: yoff - hei * 0.95 },
    { x: xoff + wid / 2, y: yoff - hei * 0.7 },
    { x: xoff + wid / 2, y: yoff + 50 }
  ];

  const col = mountainCol(0.3, yoff, 0.4, prng);
  primitives.push(poly(pts, { fil: col, str: col, wid: 0 }));

  const topRidge = stroke(pts.slice(1, 5), { wid: 2, col: fog(0.6, 0.4, prng), prng, noise });
  if (!Array.isArray(topRidge)) primitives.push(topRidge);

  return primitives;
}

export function distMount(
  xoff: number,
  yoff: number,
  seed = 0,
  options?: TerrainOptions
): ScenePrimitive[] {
  const prng = options?.prng ?? new Prng(seed + xoff * 3);
  const noise = options?.noise ?? new Noise(prng);
  const hei = options?.hei ?? 180;
  const wid = options?.wid ?? 800;

  const primitives: ScenePrimitive[] = [];
  const pts: Point2D[] = [{ x: xoff - wid / 2, y: yoff + 200 }];
  const step = 40;

  for (let x = -wid / 2; x <= wid / 2; x += step) {
    const n = noise.noise((xoff + x) * 0.002, seed);
    pts.push({ x: xoff + x, y: yoff - n * hei });
  }
  pts.push({ x: xoff + wid / 2, y: yoff + 200 });

  const col = fog(0.2, 0.25, prng);
  primitives.push(poly(pts, { fil: col, str: col, wid: 0 }));

  return primitives;
}

export function flatDec(
  xoff: number,
  yoff: number,
  options?: TerrainOptions
): ScenePrimitive[] {
  const prng = options?.prng ?? new Prng(xoff + yoff);
  const primitives: ScenePrimitive[] = [];
  const count = Math.floor(normRand(2, 5, prng));

  for (let i = 0; i < count; i++) {
    const rx = xoff + normRand(-100, 100, prng);
    const ry = yoff + normRand(-10, 10, prng);
    primitives.push(...rock(rx, ry, prng.next() * 1000, { prng }));
  }

  return primitives;
}
