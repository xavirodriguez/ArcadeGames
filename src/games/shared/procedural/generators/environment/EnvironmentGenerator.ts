/**
 * Environmental Generators: Clouds, bird flocks, fishing boats, river reeds, lanterns, and flags.
 * Adapted from Shan Shui (index(1).html) for renderer-decoupled vector primitives and deterministic execution.
 */
import type { Point2D, ScenePrimitive } from "../../types/ProceduralTypes";
import type { IPrng } from "../../random/Prng";
import type { INoise } from "../../noise/Noise";
import { Prng } from "../../random/Prng";
import { Noise } from "../../noise/Noise";
import { blob } from "../../geometry/blob";
import { stroke } from "../../geometry/stroke";
import { poly } from "../../geometry/poly";
import { normRand } from "../../random/distributions";
import { fog, ink } from "../../colors/ProceduralPalettes";

export interface EnvironmentOptions {
  len?: number;
  wid?: number;
  sca?: number;
  num?: number;
  col?: string;
  prng?: IPrng;
  noise?: INoise;
}

export function cloud01(
  x: number,
  y: number,
  seed = 0,
  options?: EnvironmentOptions
): ScenePrimitive[] {
  const prng = options?.prng ?? new Prng(seed + x + y);
  const noise = options?.noise ?? new Noise(prng);
  const len = options?.len ?? 120;
  const wid = options?.wid ?? 20;
  const col = options?.col ?? fog(0.8, 0.4, prng);
  const num = options?.num ?? Math.floor(normRand(3, 6, prng));

  const primitives: ScenePrimitive[] = [];
  for (let i = 0; i < num; i++) {
    const ox = normRand(-len * 0.25, len * 0.25, prng);
    const oy = normRand(-wid * 0.25, wid * 0.25, prng);
    const l = len * normRand(0.6, 1.0, prng);
    const w = wid * normRand(0.6, 1.0, prng);

    const b = blob(x + ox, y + oy, {
      len: l,
      wid: w,
      col,
      prng,
      noise
    });
    if (!Array.isArray(b)) primitives.push(b);
  }

  return primitives;
}

export function bird01(
  x: number,
  y: number,
  seed = 0,
  options?: EnvironmentOptions
): ScenePrimitive[] {
  const prng = options?.prng ?? new Prng(seed + x * 3 + y);
  const noise = options?.noise ?? new Noise(prng);
  const sca = options?.sca ?? 1;
  const col = options?.col ?? "rgba(60,60,60,0.8)";

  const primitives: ScenePrimitive[] = [];
  const span = 12 * sca;
  const dip = normRand(-4, 4, prng) * sca;

  const wingPts: Point2D[] = [
    { x: x - span, y: y - dip },
    { x, y },
    { x: x + span, y: y - dip }
  ];

  const wingStroke = stroke(wingPts, { wid: 1.5 * sca, col, prng, noise });
  if (!Array.isArray(wingStroke)) primitives.push(wingStroke);

  return primitives;
}

export function boat01(
  x: number,
  y: number,
  seed = 0,
  options?: EnvironmentOptions
): ScenePrimitive[] {
  const prng = options?.prng ?? new Prng(seed + x * 7 + y);
  const noise = options?.noise ?? new Noise(prng);
  const len = options?.len ?? 40;
  const hei = options?.wid ?? 10;
  const col = options?.col ?? ink(0.8, 0.5, prng);

  const primitives: ScenePrimitive[] = [];
  const boatPts: Point2D[] = [
    { x: x - len / 2, y },
    { x: x - len * 0.3, y: y + hei },
    { x: x + len * 0.3, y: y + hei },
    { x: x + len / 2, y }
  ];

  primitives.push(poly(boatPts, { fil: col, str: col, wid: 1 }));

  // Oar / fisherman line
  primitives.push({
    type: "line",
    x1: x,
    y1: y - 12,
    x2: x + 15,
    y2: y + 10,
    stroke: col,
    strokeWidth: 1.5
  });

  return primitives;
}

export function reeds01(
  x: number,
  y: number,
  options?: EnvironmentOptions
): ScenePrimitive[] {
  const prng = options?.prng ?? new Prng(x + y * 9);
  const num = options?.num ?? Math.floor(normRand(5, 12, prng));
  const primitives: ScenePrimitive[] = [];

  for (let i = 0; i < num; i++) {
    const rx = x + normRand(-15, 15, prng);
    const rh = normRand(15, 30, prng);
    primitives.push({
      type: "line",
      x1: rx,
      y1: y,
      x2: rx + normRand(-5, 5, prng),
      y2: y - rh,
      stroke: "rgba(40,50,40,0.7)",
      strokeWidth: 1.5
    });
  }

  return primitives;
}

export function lantern01(
  x: number,
  y: number,
  options?: EnvironmentOptions
): ScenePrimitive[] {
  const primitives: ScenePrimitive[] = [];

  // Hanging wire
  primitives.push({ type: "line", x1: x, y1: y - 20, x2: x, y2: y - 8, stroke: "#333", strokeWidth: 1 });
  // Paper lantern body
  primitives.push({ type: "ellipse", cx: x, cy: y, rx: 6, ry: 8, fill: "rgba(220,60,40,0.9)", stroke: "#800", strokeWidth: 1 });
  // Bottom tassel
  primitives.push({ type: "line", x1: x, y1: y + 8, x2: x, y2: y + 15, stroke: "#a00", strokeWidth: 1 });

  return primitives;
}

export function flag01(
  x: number,
  y: number,
  options?: EnvironmentOptions
): ScenePrimitive[] {
  const prng = options?.prng ?? new Prng(x + y * 13);
  const primitives: ScenePrimitive[] = [];

  // Flagpole
  primitives.push({ type: "line", x1: x, y1: y, x2: x, y2: y - 40, stroke: "#444", strokeWidth: 2 });
  // Cloth banner polygon
  const clothPts: Point2D[] = [
    { x, y: y - 40 },
    { x: x + 25 + normRand(-3, 3, prng), y: y - 35 },
    { x: x + 20 + normRand(-3, 3, prng), y: y - 20 },
    { x, y: y - 25 }
  ];

  primitives.push(poly(clothPts, { fil: "rgba(180,30,30,0.85)", str: "#800", wid: 1 }));
  return primitives;
}
