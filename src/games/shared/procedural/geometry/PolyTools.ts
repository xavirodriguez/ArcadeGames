/**
 * Pure computational geometry utilities for 2D points and polygon manipulation.
 * Adapted from Shan Shui PolyTools for strict TypeScript and zero DOM dependencies.
 */
import type { Point2D } from "../types/ProceduralTypes";

export function distance(p0: Point2D, p1: Point2D): number {
  const dx = p0.x - p1.x;
  const dy = p0.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function midPt(plist: readonly Point2D[]): Point2D {
  if (plist.length === 0) return { x: 0, y: 0 };
  let sumX = 0;
  let sumY = 0;
  for (let i = 0; i < plist.length; i++) {
    sumX += plist[i].x;
    sumY += plist[i].y;
  }
  return { x: sumX / plist.length, y: sumY / plist.length };
}

export function lineExpr(p0: Point2D, p1: Point2D): [number, number] {
  const den = p1.x - p0.x;
  const m = Math.abs(den) < 1e-9 ? Infinity : (p1.y - p0.y) / den;
  const k = p0.y - m * p0.x;
  return [m, k];
}

export function onSeg(p: Point2D, ln: [Point2D, Point2D]): boolean {
  const minX = Math.min(ln[0].x, ln[1].x) - 1e-6;
  const maxX = Math.max(ln[0].x, ln[1].x) + 1e-6;
  const minY = Math.min(ln[0].y, ln[1].y) - 1e-6;
  const maxY = Math.max(ln[0].y, ln[1].y) + 1e-6;
  return p.x >= minX && p.x <= maxX && p.y >= minY && p.y <= maxY;
}

export function intersect(ln0: [Point2D, Point2D], ln1: [Point2D, Point2D]): Point2D | false {
  const le0 = lineExpr(ln0[0], ln0[1]);
  const le1 = lineExpr(ln1[0], ln1[1]);

  if (!Number.isFinite(le0[0]) && !Number.isFinite(le1[0])) {
    return false;
  }

  if (!Number.isFinite(le0[0])) {
    const x = ln0[0].x;
    const y = le1[0] * x + le1[1];
    const p = { x, y };
    return onSeg(p, ln0) && onSeg(p, ln1) ? p : false;
  }

  if (!Number.isFinite(le1[0])) {
    const x = ln1[0].x;
    const y = le0[0] * x + le0[1];
    const p = { x, y };
    return onSeg(p, ln0) && onSeg(p, ln1) ? p : false;
  }

  const den = le0[0] - le1[0];
  if (Math.abs(den) < 1e-9) {
    return false;
  }

  const x = (le1[1] - le0[1]) / den;
  const y = le0[0] * x + le0[1];
  const p = { x, y };
  return onSeg(p, ln0) && onSeg(p, ln1) ? p : false;
}

export function ptInPoly(pt: Point2D, plist: readonly Point2D[]): boolean {
  if (plist.length < 3) return false;
  let inside = false;
  for (let i = 0, j = plist.length - 1; i < plist.length; j = i++) {
    const xi = plist[i].x;
    const yi = plist[i].y;
    const xj = plist[j].x;
    const yj = plist[j].y;

    const intersect =
      yi > pt.y !== yj > pt.y &&
      pt.x < ((xj - xi) * (pt.y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export function lnInPoly(ln: [Point2D, Point2D], plist: readonly Point2D[]): boolean {
  const ep = 0.01;
  const lnc: [Point2D, Point2D] = [
    { x: ln[0].x * (1 - ep) + ln[1].x * ep, y: ln[0].y * (1 - ep) + ln[1].y * ep },
    { x: ln[0].x * ep + ln[1].x * (1 - ep), y: ln[0].y * ep + ln[1].y * (1 - ep) }
  ];

  for (let i = 0; i < plist.length; i++) {
    const pt = plist[i];
    const np = plist[(i + 1) % plist.length];
    if (intersect(lnc, [pt, np]) !== false) {
      return false;
    }
  }

  const mid = midPt(ln);
  return ptInPoly(mid, plist);
}

export function sidesOf(plist: readonly Point2D[]): number[] {
  const slist: number[] = [];
  for (let i = 0; i < plist.length; i++) {
    const pt = plist[i];
    const np = plist[(i + 1) % plist.length];
    slist.push(distance(pt, np));
  }
  return slist;
}

export function areaOf(plist: readonly Point2D[]): number {
  if (plist.length < 3) return 0;
  if (plist.length === 3) {
    const slist = sidesOf(plist);
    const a = slist[0];
    const b = slist[1];
    const c = slist[2];
    const s = (a + b + c) / 2;
    const val = s * (s - a) * (s - b) * (s - c);
    return val > 0 ? Math.sqrt(val) : 0;
  }
  let area = 0;
  for (let i = 0; i < plist.length; i++) {
    const j = (i + 1) % plist.length;
    area += plist[i].x * plist[j].y;
    area -= plist[j].x * plist[i].y;
  }
  return Math.abs(area) / 2;
}

export function sliverRatio(plist: readonly Point2D[]): number {
  const A = areaOf(plist);
  const P = sidesOf(plist).reduce((m, n) => m + n, 0);
  return P > 0 ? A / P : 0;
}

export function bestEar(
  plist: readonly Point2D[],
  convex = false,
  optimize = true
): [Point2D[], Point2D[]] {
  if (plist.length < 3) return [Array.from(plist), []];
  const cuts: Array<[Point2D[], Point2D[]]> = [];

  for (let i = 0; i < plist.length; i++) {
    const pt = plist[i];
    const lp = plist[i !== 0 ? i - 1 : plist.length - 1];
    const np = plist[(i + 1) % plist.length];
    const qlist = plist.slice();
    qlist.splice(i, 1);

    if (convex || lnInPoly([lp, np], plist)) {
      const c: [Point2D[], Point2D[]] = [[lp, pt, np], qlist];
      if (!optimize) return c;
      cuts.push(c);
    }
  }

  if (cuts.length === 0) {
    return [[plist[0], plist[1], plist[2]], plist.slice(1)];
  }

  let best = cuts[0];
  let bestRatio = -1;
  for (let i = 0; i < cuts.length; i++) {
    const r = sliverRatio(cuts[i][0]);
    if (r >= bestRatio) {
      best = cuts[i];
      bestRatio = r;
    }
  }
  return best;
}

export function shatter(
  plist: readonly Point2D[],
  areaTarget: number,
  depth = 0
): Point2D[][] {
  if (plist.length < 3 || depth > 10) return [Array.from(plist)];
  if (areaOf(plist) <= areaTarget) return [Array.from(plist)];

  const slist = sidesOf(plist);
  let ind = 0;
  for (let i = 1; i < slist.length; i++) {
    if (slist[i] > slist[ind]) ind = i;
  }

  const nind = (ind + 1) % plist.length;
  const lind = (ind + 2) % plist.length;
  const mid = midPt([plist[ind], plist[nind]]);

  const tri1 = [plist[ind], mid, plist[lind]];
  const tri2 = [plist[lind], plist[nind], mid];

  return [
    ...shatter(tri1, areaTarget, depth + 1),
    ...shatter(tri2, areaTarget, depth + 1)
  ];
}

export function triangulate(
  plist: readonly Point2D[],
  options?: { area?: number; convex?: boolean; optimize?: boolean }
): Point2D[][] {
  if (plist.length < 3) return [];
  const area = options?.area ?? 100;
  const convex = options?.convex ?? false;
  const optimize = options?.optimize ?? true;

  if (plist.length === 3) {
    return shatter(plist, area);
  }

  const cut = bestEar(plist, convex, optimize);
  return [
    ...shatter(cut[0], area),
    ...triangulate(cut[1], options)
  ];
}
