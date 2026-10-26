/**
 * Architecture Generators: Huts, boxes, roofs, pagodas, arches, and lattice towers.
 * Adapted from Shan Shui (index(1).html) for renderer-decoupled vector primitives and deterministic execution.
 */
import type { Point2D, ScenePrimitive } from "../../types/ProceduralTypes";
import type { IPrng } from "../../random/Prng";
import type { INoise } from "../../noise/Noise";
import { Prng } from "../../random/Prng";
import { Noise } from "../../noise/Noise";
import { poly } from "../../geometry/poly";
import { stroke } from "../../geometry/stroke";
import { normRand } from "../../random/distributions";
import { ink, fogMask } from "../../colors/ProceduralPalettes";

export interface ArchitectureOptions {
  hei?: number;
  wid?: number;
  rot?: number;
  sto?: number;
  prng?: IPrng;
  noise?: INoise;
}

export function hut(xoff: number, yoff: number, options?: ArchitectureOptions): ScenePrimitive[] {
  const prng = options?.prng ?? new Prng(xoff + yoff);
  const hei = options?.hei ?? 40;
  const wid = options?.wid ?? 180;

  const primitives: ScenePrimitive[] = [];
  const roofPts: Point2D[] = [
    { x: xoff - wid / 2, y: yoff },
    { x: xoff, y: yoff - hei },
    { x: xoff + wid / 2, y: yoff }
  ];

  primitives.push(poly(roofPts, { fil: fogMask(), str: ink(0.8, 0.5, prng), wid: 2 }));
  return primitives;
}

export function box(xoff: number, yoff: number, options?: ArchitectureOptions): ScenePrimitive[] {
  const prng = options?.prng ?? new Prng(xoff * 2 + yoff);
  const hei = options?.hei ?? 30;
  const wid = options?.wid ?? 120;

  const primitives: ScenePrimitive[] = [];
  const bodyPts: Point2D[] = [
    { x: xoff - wid / 2, y: yoff },
    { x: xoff - wid / 2, y: yoff - hei },
    { x: xoff + wid / 2, y: yoff - hei },
    { x: xoff + wid / 2, y: yoff }
  ];

  primitives.push(poly(bodyPts, { fil: fogMask(), str: ink(0.8, 0.5, prng), wid: 2 }));
  return primitives;
}

export function roof(xoff: number, yoff: number, options?: ArchitectureOptions): ScenePrimitive[] {
  const prng = options?.prng ?? new Prng(xoff + yoff * 3);
  const hei = options?.hei ?? 25;
  const wid = options?.wid ?? 140;

  const primitives: ScenePrimitive[] = [];
  const roofPts: Point2D[] = [
    { x: xoff - wid / 2 - 10, y: yoff },
    { x: xoff - wid / 2 + 10, y: yoff - hei },
    { x: xoff + wid / 2 - 10, y: yoff - hei },
    { x: xoff + wid / 2 + 10, y: yoff }
  ];

  primitives.push(poly(roofPts, { fil: ink(0.9, 0.5, prng), str: ink(0.9, 0.5, prng), wid: 1 }));
  return primitives;
}

export function pagroof(xoff: number, yoff: number, options?: ArchitectureOptions): ScenePrimitive[] {
  const prng = options?.prng ?? new Prng(xoff + yoff * 4);
  const hei = options?.hei ?? 30;
  const wid = options?.wid ?? 160;

  const primitives: ScenePrimitive[] = [];
  // Curved pagoda roof silhouette
  const roofPts: Point2D[] = [
    { x: xoff - wid / 2 - 15, y: yoff - 5 },
    { x: xoff - wid / 2, y: yoff },
    { x: xoff, y: yoff - hei },
    { x: xoff + wid / 2, y: yoff },
    { x: xoff + wid / 2 + 15, y: yoff - 5 }
  ];

  primitives.push(poly(roofPts, { fil: ink(0.9, 0.5, prng), str: ink(0.9, 0.5, prng), wid: 1 }));
  return primitives;
}

export function arch01(xoff: number, yoff: number, seed = 0, options?: ArchitectureOptions): ScenePrimitive[] {
  const prng = options?.prng ?? new Prng(seed + xoff);
  const primitives: ScenePrimitive[] = [];

  primitives.push(...box(xoff, yoff, { hei: 40, wid: 100, prng }));
  primitives.push(...roof(xoff, yoff - 40, { hei: 25, wid: 120, prng }));
  return primitives;
}

export function arch02(xoff: number, yoff: number, seed = 0, options?: ArchitectureOptions): ScenePrimitive[] {
  const prng = options?.prng ?? new Prng(seed + xoff + yoff);
  const sto = options?.sto ?? 3;
  const primitives: ScenePrimitive[] = [];

  let curY = yoff;
  let curWid = 120;

  for (let i = 0; i < sto; i++) {
    primitives.push(...box(xoff, curY, { hei: 30, wid: curWid, prng }));
    primitives.push(...pagroof(xoff, curY - 30, { hei: 20, wid: curWid + 20, prng }));
    curY -= 50;
    curWid *= 0.8;
  }

  return primitives;
}

export function arch03(xoff: number, yoff: number, seed = 0, options?: ArchitectureOptions): ScenePrimitive[] {
  const prng = options?.prng ?? new Prng(seed + xoff * 2);
  const primitives: ScenePrimitive[] = [];
  const wid = options?.wid ?? 160;

  // Arch bridge curve
  const bridgePts: Point2D[] = [];
  for (let i = 0; i <= 10; i++) {
    const p = i / 10;
    const x = xoff - wid / 2 + p * wid;
    const y = yoff - Math.sin(p * Math.PI) * 30;
    bridgePts.push({ x, y });
  }

  const bridgeStroke = stroke(bridgePts, { wid: 6, col: ink(0.8, 0.5, prng), prng });
  if (!Array.isArray(bridgeStroke)) primitives.push(bridgeStroke);

  return primitives;
}

export function arch04(xoff: number, yoff: number, seed = 0, options?: ArchitectureOptions): ScenePrimitive[] {
  const prng = options?.prng ?? new Prng(seed + xoff + 7);
  const primitives: ScenePrimitive[] = [];

  // Torii / Stone Gate
  const pillars: Point2D[] = [
    { x: xoff - 40, y: yoff },
    { x: xoff - 40, y: yoff - 60 },
    { x: xoff + 40, y: yoff },
    { x: xoff + 40, y: yoff - 60 }
  ];

  primitives.push({ type: "line", x1: pillars[0].x, y1: pillars[0].y, x2: pillars[1].x, y2: pillars[1].y, stroke: ink(0.9, 0.5, prng), strokeWidth: 5 });
  primitives.push({ type: "line", x1: pillars[2].x, y1: pillars[2].y, x2: pillars[3].x, y2: pillars[3].y, stroke: ink(0.9, 0.5, prng), strokeWidth: 5 });
  primitives.push({ type: "line", x1: xoff - 55, y1: yoff - 55, x2: xoff + 55, y2: yoff - 55, stroke: ink(0.9, 0.5, prng), strokeWidth: 6 });

  return primitives;
}

export function transmissionTower01(xoff: number, yoff: number, seed = 0, options?: ArchitectureOptions): ScenePrimitive[] {
  const prng = options?.prng ?? new Prng(seed + xoff * 5);
  const primitives: ScenePrimitive[] = [];
  const hei = options?.hei ?? 140;

  // Lattice metal legs
  primitives.push({ type: "line", x1: xoff - 20, y1: yoff, x2: xoff - 5, y2: yoff - hei, stroke: ink(0.7, 0.5, prng), strokeWidth: 2 });
  primitives.push({ type: "line", x1: xoff + 20, y1: yoff, x2: xoff + 5, y2: yoff - hei, stroke: ink(0.7, 0.5, prng), strokeWidth: 2 });

  // Cross braces
  for (let y = yoff - 20; y > yoff - hei; y -= 20) {
    primitives.push({ type: "line", x1: xoff - 15, y1: y, x2: xoff + 15, y2: y - 10, stroke: ink(0.6, 0.5, prng), strokeWidth: 1 });
  }

  return primitives;
}
