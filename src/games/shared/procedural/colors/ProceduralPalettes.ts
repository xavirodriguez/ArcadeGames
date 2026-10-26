/**
 * Procedural color palettes, depth modulation, and ink-wash shaders.
 * Ported from Shan Shui (index(1).html) and updated for deterministic execution.
 */
import type { IPrng } from "../random/Prng";
import { randChoice } from "../random/distributions";

export interface RGBColor {
  r: number;
  g: number;
  b: number;
}

export type PaletteFamily = "ink" | "stone" | "jade" | "slate" | "fog";

export const PROCEDURAL_PALETTES: Record<PaletteFamily, readonly [number, number, number][]> = {
  ink: [
    [23, 24, 23],   // #171817
    [37, 37, 34],   // #252522
    [58, 58, 53],   // #3A3A35
    [76, 76, 69]    // #4C4C45
  ],
  stone: [
    [92, 91, 84],   // #5C5B54
    [119, 118, 107],// #77766B
    [146, 144, 135],// #929087
    [170, 167, 154] // #AAA79A
  ],
  jade: [
    [69, 88, 73],   // #455849
    [100, 123, 104],// #647B68
    [126, 145, 123],// #7E917B
    [154, 165, 141] // #9AA58D
  ],
  slate: [
    [62, 85, 92],   // #3E555C
    [83, 107, 114], // #536B72
    [110, 130, 133],// #6E8285
    [140, 153, 152] // #8C9998
  ],
  fog: [
    [200, 196, 181],// #C8C4B5
    [222, 217, 201],// #DED9C9
    [232, 227, 212],// #E8E3D4
    [240, 235, 221] // #F0EBDD
  ]
};

export function getColor(
  family: PaletteFamily = "ink",
  t?: number,
  alpha = 1,
  prng?: IPrng,
  paletteMode?: string
): string {
  const a = parseFloat(Math.max(0, Math.min(1, alpha)).toFixed(3));
  if (paletteMode === "mono") {
    if (family === "fog") return `rgba(255,255,255,${a})`;
    return `rgba(100,100,100,${a})`;
  }

  const tones = PROCEDURAL_PALETTES[family] || PROCEDURAL_PALETTES.ink;
  let rgb: readonly [number, number, number];

  if (t === undefined || t === null) {
    rgb = prng ? randChoice(tones, prng) : tones[0];
  } else {
    const clampedT = Math.max(0, Math.min(1, t));
    const idx = clampedT * (tones.length - 1);
    const i0 = Math.floor(idx);
    const i1 = Math.min(i0 + 1, tones.length - 1);
    const f = idx - i0;
    rgb = [
      Math.round(tones[i0][0] + (tones[i1][0] - tones[i0][0]) * f),
      Math.round(tones[i0][1] + (tones[i1][1] - tones[i0][1]) * f),
      Math.round(tones[i0][2] + (tones[i1][2] - tones[i0][2]) * f)
    ];
  }

  return `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})`;
}

export function ink(alpha = 0.9, tone?: number, prng?: IPrng): string {
  return getColor("ink", tone, alpha, prng);
}

export function stone(tone?: number, alpha = 1, prng?: IPrng): string {
  return getColor("stone", tone, alpha, prng);
}

export function jade(tone?: number, alpha = 1, prng?: IPrng): string {
  return getColor("jade", tone, alpha, prng);
}

export function slate(tone?: number, alpha = 1, prng?: IPrng): string {
  return getColor("slate", tone, alpha, prng);
}

export function fog(tone?: number, alpha = 1, prng?: IPrng): string {
  return getColor("fog", tone, alpha, prng);
}

export function fogMask(paletteMode?: string): string {
  if (paletteMode === "mono") return "#ffffff";
  return "#DED9C9";
}

export function getDepth(tag: string, y: number): number {
  if (tag === "distmount") {
    const d = 1.0 - Math.max(0, Math.min(0.15, (y - 200) / 500));
    return parseFloat(Math.max(0.8, Math.min(1.0, d)).toFixed(3));
  }
  const ny = Math.max(250, Math.min(750, y));
  const t = (ny - 250) / 500.0;
  let depth = 1.0 - t * 0.85;
  if (tag === "flatmount" || tag === "boat") {
    depth = 0.95 - t * 0.85;
  }
  return parseFloat(Math.max(0.0, Math.min(1.0, depth)).toFixed(3));
}

export function mountainCol(
  x: number,
  yoff = 500,
  depth?: number,
  prng?: IPrng,
  paletteMode?: string
): string {
  const t = 1 - Math.max(0, Math.min(1, x));
  const randVal = prng ? prng.next() : 0.5;
  const alphaVal = parseFloat((randVal * 0.3 + 0.1).toFixed(3));

  if (paletteMode === "mono") {
    return `rgba(100,100,100,${(randVal * 0.3).toFixed(3)})`;
  }

  const calculatedDepth = depth ?? getDepth("mount", yoff);
  const stoneRGB = PROCEDURAL_PALETTES.stone;
  const slateRGB = PROCEDURAL_PALETTES.slate;
  const fogRGB = PROCEDURAL_PALETTES.fog;

  const idx = t * (stoneRGB.length - 1);
  const i0 = Math.floor(idx);
  const i1 = Math.min(i0 + 1, stoneRGB.length - 1);
  const f = idx - i0;

  const rStone = stoneRGB[i0][0] + (stoneRGB[i1][0] - stoneRGB[i0][0]) * f;
  const gStone = stoneRGB[i0][1] + (stoneRGB[i1][1] - stoneRGB[i0][1]) * f;
  const bStone = stoneRGB[i0][2] + (stoneRGB[i1][2] - stoneRGB[i0][2]) * f;

  const rSlate = slateRGB[i0][0] + (slateRGB[i1][0] - slateRGB[i0][0]) * f;
  const gSlate = slateRGB[i0][1] + (slateRGB[i1][1] - slateRGB[i0][1]) * f;
  const bSlate = slateRGB[i0][2] + (slateRGB[i1][2] - slateRGB[i0][2]) * f;

  const rFog = fogRGB[i0][0] + (fogRGB[i1][0] - fogRGB[i0][0]) * f;
  const gFog = fogRGB[i0][1] + (fogRGB[i1][1] - fogRGB[i0][1]) * f;
  const bFog = fogRGB[i0][2] + (fogRGB[i1][2] - fogRGB[i0][2]) * f;

  let r: number;
  let g: number;
  let b: number;

  if (calculatedDepth < 0.5) {
    const ratio = calculatedDepth / 0.5;
    r = Math.round(rStone * (1 - ratio) + rSlate * ratio);
    g = Math.round(gStone * (1 - ratio) + gSlate * ratio);
    b = Math.round(bStone * (1 - ratio) + bSlate * ratio);
  } else {
    const ratio = (calculatedDepth - 0.5) / 0.5;
    r = Math.round(rSlate * (1 - ratio) + rFog * ratio);
    g = Math.round(gSlate * (1 - ratio) + gFog * ratio);
    b = Math.round(bSlate * (1 - ratio) + bFog * ratio);
  }

  const dAlpha =
    calculatedDepth > 0.6
      ? Math.max(0.05, alphaVal * (1 - (calculatedDepth - 0.6) * 0.8))
      : alphaVal;

  return `rgba(${r},${g},${b},${dAlpha})`;
}
