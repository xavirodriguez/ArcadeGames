/**
 * Vegetation Generators: Tree archetypes (tree01..tree08), branch, twig, and barkify helpers.
 * Adapted from Shan Shui (index(1).html) for renderer-decoupled vector primitives and deterministic execution.
 */
import type { Point2D, ScenePrimitive } from "../../types/ProceduralTypes";
import type { IPrng } from "../../random/Prng";
import type { INoise } from "../../noise/Noise";
import { Prng } from "../../random/Prng";
import { Noise } from "../../noise/Noise";
import { poly } from "../../geometry/poly";
import { stroke } from "../../geometry/stroke";
import { blob } from "../../geometry/blob";
import { normRand } from "../../random/distributions";
import { ink, jade } from "../../colors/ProceduralPalettes";

export interface TreeOptions {
  hei?: number;
  wid?: number;
  col?: string;
  noi?: number;
  clu?: number;
  ben?: (x: number) => number;
  prng?: IPrng;
  noise?: INoise;
}

export function twig(
  tx: number,
  ty: number,
  dep = 1,
  options?: { dir?: number; sca?: number; wid?: number; col?: string; prng?: IPrng; noise?: INoise }
): ScenePrimitive[] {
  const prng = options?.prng ?? new Prng(tx + ty);
  const noise = options?.noise ?? new Noise(prng);
  const dir = options?.dir ?? 1;
  const sca = options?.sca ?? 1;
  const wid = options?.wid ?? 1;
  const col = options?.col ?? ink(0.8, 0.5, prng);

  const primitives: ScenePrimitive[] = [];
  const ptlist: Point2D[] = [
    { x: tx, y: ty },
    { x: tx + dir * 10 * sca, y: ty - 12 * sca * dep }
  ];

  const twStroke = stroke(ptlist, { wid, col, prng, noise });
  if (!Array.isArray(twStroke)) primitives.push(twStroke);
  return primitives;
}

export function branch(
  startPt: Point2D,
  options?: { hei?: number; wid?: number; ang?: number; col?: string; prng?: IPrng; noise?: INoise }
): ScenePrimitive[] {
  const prng = options?.prng ?? new Prng(startPt.x + startPt.y);
  const noise = options?.noise ?? new Noise(prng);
  const hei = options?.hei ?? 60;
  const wid = options?.wid ?? 4;
  const ang = options?.ang ?? -Math.PI / 2;
  const col = options?.col ?? ink(0.8, 0.5, prng);

  const primitives: ScenePrimitive[] = [];
  const endPt: Point2D = {
    x: startPt.x + Math.cos(ang) * hei,
    y: startPt.y + Math.sin(ang) * hei
  };

  const bStroke = stroke([startPt, endPt], { wid, col, prng, noise });
  if (!Array.isArray(bStroke)) primitives.push(bStroke);

  primitives.push(...twig(endPt.x, endPt.y, 1, { sca: 0.8, prng, noise }));
  return primitives;
}

export function barkify(
  ptlist: readonly Point2D[],
  prng: IPrng,
  noise: INoise,
  color = "rgba(0,0,0,0.3)"
): ScenePrimitive[] {
  const primitives: ScenePrimitive[] = [];
  if (ptlist.length < 2) return primitives;

  for (let i = 0; i < ptlist.length - 1; i++) {
    const p0 = ptlist[i];
    const p1 = ptlist[i + 1];
    const len = Math.hypot(p1.x - p0.x, p1.y - p0.y);
    if (len < 5) continue;

    const midX = (p0.x + p1.x) / 2 + normRand(-2, 2, prng);
    const midY = (p0.y + p1.y) / 2 + normRand(-2, 2, prng);

    primitives.push({
      type: "line",
      x1: p0.x,
      y1: p0.y,
      x2: midX,
      y2: midY,
      stroke: color,
      strokeWidth: 1,
      alpha: 0.5
    });
  }

  return primitives;
}

export function tree01(x: number, y: number, options?: TreeOptions): ScenePrimitive[] {
  const prng = options?.prng ?? new Prng(x * 100 + y);
  const noise = options?.noise ?? new Noise(prng);
  const hei = options?.hei ?? 50;
  const wid = options?.wid ?? 3;
  const col = options?.col ?? jade(0.5, 0.5, prng);
  const noi = options?.noi ?? 0.5;

  const primitives: ScenePrimitive[] = [];
  const reso = 10;
  const trlist: Point2D[] = [];

  for (let i = 0; i < reso; i++) {
    const nx = x + normRand(-wid, wid, prng) * (1 - i / reso);
    const ny = y - (i / reso) * hei;
    trlist.push({ x: nx, y: ny });
  }

  const trunkPoly = stroke(trlist, { wid, col: ink(0.7, 0.5, prng), noi, prng, noise });
  if (!Array.isArray(trunkPoly)) primitives.push(trunkPoly);

  for (let i = 2; i < reso; i++) {
    const clusterY = trlist[i].y;
    const clusterX = trlist[i].x;
    const clusterWid = (1 - i / reso) * hei * 0.4;

    const b = blob(clusterX, clusterY, {
      len: clusterWid * 2,
      wid: clusterWid * 0.8,
      col,
      noi: 0.6,
      prng,
      noise
    });
    if (!Array.isArray(b)) primitives.push(b);
  }

  return primitives;
}

export function tree02(x: number, y: number, options?: TreeOptions): ScenePrimitive[] {
  const prng = options?.prng ?? new Prng(x * 101 + y);
  const noise = options?.noise ?? new Noise(prng);
  const hei = options?.hei ?? 16;
  const wid = options?.wid ?? 8;
  const clu = options?.clu ?? 5;
  const col = options?.col ?? jade(0.5, 0.5, prng);

  const primitives: ScenePrimitive[] = [];
  const trlist: Point2D[] = [
    { x, y },
    { x: x + normRand(-2, 2, prng), y: y - hei }
  ];

  const trunkPoly = stroke(trlist, { wid: wid * 0.5, col: ink(0.8, 0.5, prng), prng, noise });
  if (!Array.isArray(trunkPoly)) primitives.push(trunkPoly);

  const topPt = trlist[1];
  for (let i = 0; i < clu; i++) {
    const cx = topPt.x + normRand(-wid, wid, prng);
    const cy = topPt.y + normRand(-wid, wid, prng);
    const b = blob(cx, cy, {
      len: wid * 2,
      wid: wid * 1.5,
      col,
      prng,
      noise
    });
    if (!Array.isArray(b)) primitives.push(b);
  }

  return primitives;
}

export function tree03(x: number, y: number, options?: TreeOptions): ScenePrimitive[] {
  const prng = options?.prng ?? new Prng(x * 102 + y);
  const noise = options?.noise ?? new Noise(prng);
  const hei = options?.hei ?? 50;
  const wid = options?.wid ?? 5;
  const col = options?.col ?? jade(0.5, 0.5, prng);

  const primitives: ScenePrimitive[] = [];
  const trlist: Point2D[] = [];
  const reso = 10;

  for (let i = 0; i < reso; i++) {
    const p = i / reso;
    trlist.push({
      x: x + Math.sin(p * Math.PI) * 10,
      y: y - p * hei
    });
  }

  const trunkPoly = stroke(trlist, { wid, col: ink(0.8, 0.5, prng), prng, noise });
  if (!Array.isArray(trunkPoly)) primitives.push(trunkPoly);

  const topPt = trlist[trlist.length - 1];
  for (let i = 0; i < 12; i++) {
    const ang = (i / 12) * Math.PI * 2;
    const fx = topPt.x + Math.cos(ang) * 15;
    const fy = topPt.y + Math.sin(ang) * 5 + 15;

    primitives.push({
      type: "line",
      x1: topPt.x,
      y1: topPt.y,
      x2: fx,
      y2: fy,
      stroke: col,
      strokeWidth: 1.5,
      alpha: 0.8
    });
  }

  return primitives;
}

export function tree04(x: number, y: number, options?: TreeOptions): ScenePrimitive[] {
  const prng = options?.prng ?? new Prng(x * 103 + y);
  const noise = options?.noise ?? new Noise(prng);
  const hei = options?.hei ?? 70;
  const wid = options?.wid ?? 4;
  const col = options?.col ?? ink(0.8, 0.5, prng);

  const primitives: ScenePrimitive[] = [];
  const trlist: Point2D[] = [
    { x, y },
    { x: x + normRand(-3, 3, prng), y: y - hei * 0.5 },
    { x: x + normRand(-5, 5, prng), y: y - hei }
  ];

  const trunkPoly = stroke(trlist, { wid, col, prng, noise });
  if (!Array.isArray(trunkPoly)) primitives.push(trunkPoly);

  trlist.forEach(p => {
    primitives.push({
      type: "ellipse",
      cx: p.x,
      cy: p.y,
      rx: wid * 1.2,
      ry: 2,
      fill: col
    });
  });

  return primitives;
}

export function tree05(x: number, y: number, options?: TreeOptions): ScenePrimitive[] {
  const prng = options?.prng ?? new Prng(x * 104 + y);
  const noise = options?.noise ?? new Noise(prng);
  const hei = options?.hei ?? 80;
  const wid = options?.wid ?? 6;
  const col = options?.col ?? ink(0.8, 0.5, prng);

  const primitives: ScenePrimitive[] = [];
  const trlist: Point2D[] = [
    { x, y },
    { x: x + normRand(-10, 10, prng), y: y - hei * 0.4 },
    { x: x + normRand(-15, 15, prng), y: y - hei }
  ];

  const trunkPoly = stroke(trlist, { wid, col, prng, noise });
  if (!Array.isArray(trunkPoly)) primitives.push(trunkPoly);

  primitives.push(...barkify(trlist, prng, noise));

  return primitives;
}

export function tree06(x: number, y: number, options?: TreeOptions): ScenePrimitive[] {
  const prng = options?.prng ?? new Prng(x * 105 + y);
  const noise = options?.noise ?? new Noise(prng);
  const hei = options?.hei ?? 60;
  const wid = options?.wid ?? 5;
  const col = options?.col ?? ink(0.8, 0.5, prng);

  const primitives: ScenePrimitive[] = [];

  function fracTree(
    startPt: Point2D,
    length: number,
    angle: number,
    branchWidth: number,
    depth: number
  ) {
    if (depth > 4 || length < 4) return;
    const endPt: Point2D = {
      x: startPt.x + Math.cos(angle) * length,
      y: startPt.y + Math.sin(angle) * length
    };

    const branchPoly = stroke([startPt, endPt], {
      wid: branchWidth,
      col,
      prng,
      noise
    });
    if (!Array.isArray(branchPoly)) primitives.push(branchPoly);

    fracTree(endPt, length * 0.7, angle - 0.4 + normRand(-0.1, 0.1, prng), branchWidth * 0.7, depth + 1);
    fracTree(endPt, length * 0.7, angle + 0.4 + normRand(-0.1, 0.1, prng), branchWidth * 0.7, depth + 1);
  }

  fracTree({ x, y }, hei * 0.4, -Math.PI / 2, wid, 0);
  return primitives;
}

export function tree07(x: number, y: number, options?: TreeOptions): ScenePrimitive[] {
  const prng = options?.prng ?? new Prng(x * 106 + y);
  const noise = options?.noise ?? new Noise(prng);
  const hei = options?.hei ?? 60;
  const wid = options?.wid ?? 4;
  const col = options?.col ?? jade(0.6, 0.5, prng);

  const primitives: ScenePrimitive[] = [];
  const trlist: Point2D[] = [
    { x, y },
    { x: x + normRand(-2, 2, prng), y: y - hei }
  ];

  const trunkPoly = stroke(trlist, { wid, col: ink(0.8, 0.5, prng), prng, noise });
  if (!Array.isArray(trunkPoly)) primitives.push(trunkPoly);

  const conePoly = poly([
    { x: x - hei * 0.25, y },
    { x: x + hei * 0.25, y },
    { x: trlist[1].x, y: trlist[1].y }
  ], { fil: col, wid: 0 });

  primitives.push(conePoly);
  return primitives;
}

export function tree08(x: number, y: number, options?: TreeOptions): ScenePrimitive[] {
  const prng = options?.prng ?? new Prng(x * 107 + y);
  const noise = options?.noise ?? new Noise(prng);
  const hei = options?.hei ?? 80;
  const wid = options?.wid ?? 6;
  const col = options?.col ?? ink(0.8, 0.5, prng);

  const primitives: ScenePrimitive[] = [];
  const trlist: Point2D[] = [
    { x, y },
    { x: x + normRand(-15, 15, prng), y: y - hei * 0.3 },
    { x: x + normRand(-25, 25, prng), y: y - hei * 0.7 },
    { x: x + normRand(-20, 20, prng), y: y - hei }
  ];

  const trunkPoly = stroke(trlist, { wid, col, prng, noise });
  if (!Array.isArray(trunkPoly)) primitives.push(trunkPoly);

  trlist.slice(1).forEach(pt => {
    const tuft = blob(pt.x, pt.y, {
      len: 25,
      wid: 12,
      col: jade(0.5, 0.5, prng),
      prng,
      noise
    });
    if (!Array.isArray(tuft)) primitives.push(tuft);
  });

  return primitives;
}
