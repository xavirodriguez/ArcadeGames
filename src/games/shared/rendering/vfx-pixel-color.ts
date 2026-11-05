/**
 * Renderer-independent color and pixel utilities for procedural VFX.
 * Color inputs and outputs use normalized sRGB channels unless documented otherwise.
 */
import { clamp, finiteNumber, nonNegativeInteger, positiveNumber } from "./vfx-core";

export interface RGB { r: number; g: number; b: number; }
export interface OKLab { L: number; a: number; b: number; }
export interface OKLCH { L: number; C: number; h: number; }

function validateRGB(color: RGB): void {
  finiteNumber(color.r, "r"); finiteNumber(color.g, "g"); finiteNumber(color.b, "b");
}
function linearize(c: number): number {
  const v = clamp(c, 0, 1);
  return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
}
function delinearize(c: number): number {
  const v = Math.max(0, c);
  return v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
}

export function rgbToOklab(rgb: RGB): OKLab {
  validateRGB(rgb);
  const r = linearize(rgb.r), g = linearize(rgb.g), b = linearize(rgb.b);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return {
    L: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    a: 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    b: 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s
  };
}

export function oklabToRgb(lab: OKLab): RGB {
  finiteNumber(lab.L, "L"); finiteNumber(lab.a, "a"); finiteNumber(lab.b, "b");
  const l = Math.pow(lab.L + 0.3963377774 * lab.a + 0.2158037573 * lab.b, 3);
  const m = Math.pow(lab.L - 0.1055613458 * lab.a - 0.0638541728 * lab.b, 3);
  const s = Math.pow(lab.L - 0.0894841775 * lab.a - 1.291485548 * lab.b, 3);
  return {
    r: clamp(delinearize(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s), 0, 1),
    g: clamp(delinearize(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s), 0, 1),
    b: clamp(delinearize(-0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s), 0, 1)
  };
}

export function oklabToOklch(lab: OKLab): OKLCH {
  finiteNumber(lab.L, "L"); finiteNumber(lab.a, "a"); finiteNumber(lab.b, "b");
  const C = Math.hypot(lab.a, lab.b);
  const h = C < 1e-9 ? 0 : ((Math.atan2(lab.b, lab.a) * 180 / Math.PI) + 360) % 360;
  return { L: lab.L, C, h };
}
export function oklchToOklab(lch: OKLCH): OKLab {
  finiteNumber(lch.L, "L"); nonNegativeInteger(Math.floor(lch.C * 1e9), "chroma");
  finiteNumber(lch.C, "C"); finiteNumber(lch.h, "h");
  if (lch.C < 0) throw new RangeError("C must not be negative");
  const angle = lch.h * Math.PI / 180;
  return { L: lch.L, a: lch.C * Math.cos(angle), b: lch.C * Math.sin(angle) };
}

export function mixOklab(a: RGB, b: RGB, t: number): RGB {
  finiteNumber(t, "t");
  const x = rgbToOklab(a), y = rgbToOklab(b);
  return oklabToRgb({ L: x.L + (y.L - x.L) * t, a: x.a + (y.a - x.a) * t, b: x.b + (y.b - x.b) * t });
}

export function createPerceptualRamp(from: RGB, to: RGB, steps: number): RGB[] {
  nonNegativeInteger(steps, "steps");
  if (steps < 2) throw new RangeError("steps must be at least 2");
  return Array.from({ length: steps }, (_, i) => mixOklab(from, to, i / (steps - 1)));
}

export function rgbToHex(rgb: RGB): string {
  validateRGB(rgb);
  const hex = (value: number): string => Math.round(clamp(value, 0, 1) * 255).toString(16).padStart(2, "0");
  return `#${hex(rgb.r)}${hex(rgb.g)}${hex(rgb.b)}`;
}

export function hexToRgb(hex: string): RGB {
  if (!/^#?(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(hex)) throw new RangeError("hex must be a 3- or 6-digit RGB color");
  const raw = hex.replace("#", "");
  const full = raw.length === 3 ? raw.split("").map(c => c + c).join("") : raw;
  return { r: parseInt(full.slice(0, 2), 16) / 255, g: parseInt(full.slice(2, 4), 16) / 255, b: parseInt(full.slice(4, 6), 16) / 255 };
}

export function posterize(channel: number, levels: number): number {
  finiteNumber(channel, "channel"); positiveNumber(levels, "levels");
  if (!Number.isSafeInteger(levels) || levels < 2) throw new RangeError("levels must be an integer of at least 2");
  return Math.round(clamp(channel, 0, 1) * (levels - 1)) / (levels - 1);
}

const BAYER_4 = [
  [0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]
] as const;

/** Ordered 4x4 Bayer threshold in [0,1); coordinates may be negative. */
export function bayerThreshold(x: number, y: number): number {
  finiteNumber(x, "x"); finiteNumber(y, "y");
  if (!Number.isSafeInteger(x) || !Number.isSafeInteger(y)) throw new RangeError("Bayer coordinates must be integers");
  return (BAYER_4[((y % 4) + 4) % 4][((x % 4) + 4) % 4] + 0.5) / 16;
}

/** Ordered dithering before quantization. */
export function ditherIndex(channel: number, levels: number, x: number, y: number): number {
  finiteNumber(channel, "channel"); positiveNumber(levels, "levels");
  if (!Number.isSafeInteger(levels) || levels < 2) throw new RangeError("levels must be an integer of at least 2");
  const scaled = clamp(channel, 0, 1) * (levels - 1);
  const threshold = bayerThreshold(x, y);
  return clamp(Math.floor(scaled + threshold), 0, levels - 1);
}

export function remapPalette(color: RGB, palette: readonly RGB[]): RGB {
  validateRGB(color);
  if (palette.length === 0) throw new RangeError("palette must not be empty");
  const target = rgbToOklab(color);
  let best = palette[0];
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const candidate of palette) {
    const lab = rgbToOklab(candidate);
    const dL = target.L - lab.L, da = target.a - lab.a, db = target.b - lab.b;
    const distance = dL * dL + da * da + db * db;
    if (distance < bestDistance) { bestDistance = distance; best = candidate; }
  }
  return { r: best.r, g: best.g, b: best.b };
}

/** SDF coverage with a one-pixel antialias transition. */
export function sdfCoverage(distance: number, pixelWidth = 1): number {
  finiteNumber(distance, "distance"); positiveNumber(pixelWidth, "pixelWidth");
  return clamp(0.5 - distance / pixelWidth, 0, 1);
}

/** Rasterizes a signed-distance callback into an 8-bit alpha mask. */
export function rasterizeSdf(
  width: number, height: number, sdf: (x: number, y: number) => number, pixelWidth = 1
): Uint8Array {
  positiveNumber(width, "width"); positiveNumber(height, "height"); positiveNumber(pixelWidth, "pixelWidth");
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height)) throw new RangeError("dimensions must be integers");
  if (width * height > 16_777_216) throw new RangeError("raster exceeds the 16-megapixel safety limit");
  const output = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const distance = finiteNumber(sdf(x + 0.5, y + 0.5), "sdf result");
      output[y * width + x] = Math.round(sdfCoverage(distance, pixelWidth) * 255);
    }
  }
  return output;
}

/** Nearest-neighbor integer upscaling of a tightly packed RGBA buffer. */
export function upscaleNearest(
  source: Uint8Array, width: number, height: number, factor: number
): { data: Uint8Array; width: number; height: number } {
  positiveNumber(width, "width"); positiveNumber(height, "height"); positiveNumber(factor, "factor");
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || !Number.isSafeInteger(factor)) {
    throw new RangeError("width, height and factor must be integers");
  }
  if (source.length !== width * height * 4) throw new RangeError("source must contain exactly width * height * 4 RGBA bytes");
  const outWidth = width * factor, outHeight = height * factor;
  if (outWidth * outHeight > 16_777_216) throw new RangeError("upscaled image exceeds the 16-megapixel safety limit");
  const output = new Uint8Array(outWidth * outHeight * 4);
  for (let y = 0; y < outHeight; y++) {
    for (let x = 0; x < outWidth; x++) {
      const sourceOffset = (Math.floor(y / factor) * width + Math.floor(x / factor)) * 4;
      const targetOffset = (y * outWidth + x) * 4;
      output[targetOffset] = source[sourceOffset];
      output[targetOffset + 1] = source[sourceOffset + 1];
      output[targetOffset + 2] = source[sourceOffset + 2];
      output[targetOffset + 3] = source[sourceOffset + 3];
    }
  }
  return { data: output, width: outWidth, height: outHeight };
}
