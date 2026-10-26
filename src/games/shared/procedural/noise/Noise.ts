/**
 * Perlin noise generator adapted from p5.js and Shan Shui (index(1).html).
 * Seedable, state-encapsulated, and 100% deterministic without global state or Math.random().
 */
import type { IPrng } from "../random/Prng";
import { Prng } from "../random/Prng";
import type { Point2D } from "../types/ProceduralTypes";

const PERLIN_YWRAPB = 4;
const PERLIN_YWRAP = 1 << PERLIN_YWRAPB;
const PERLIN_ZWRAPB = 8;
const PERLIN_ZWRAP = 1 << PERLIN_ZWRAPB;
const PERLIN_SIZE = 4095;

function scaledCosine(i: number): number {
  return 0.5 * (1.0 - Math.cos(i * Math.PI));
}

export interface INoise {
  noise(x: number, y?: number, z?: number): number;
  noiseDetail(lod: number, falloff: number): void;
  noiseSeed(seed: number | string | IPrng): void;
}

export class Noise implements INoise {
  private octaves = 4;
  private ampFalloff = 0.5;
  private perlin: number[];

  constructor(seed?: number | string | IPrng) {
    this.perlin = new Array(PERLIN_SIZE + 1);
    this.noiseSeed(seed ?? 12345);
  }

  public noiseSeed(seed: number | string | IPrng): void {
    let prngInstance: IPrng;
    if (typeof seed === "object" && seed !== null && "next" in seed) {
      prngInstance = seed;
    } else {
      prngInstance = new Prng(seed);
    }

    for (let i = 0; i <= PERLIN_SIZE; i++) {
      this.perlin[i] = prngInstance.next();
    }
  }

  public noiseDetail(lod: number, falloff: number): void {
    if (lod > 0) {
      this.octaves = Math.floor(lod);
    }
    if (falloff > 0) {
      this.ampFalloff = falloff;
    }
  }

  public noise(x: number, y = 0, z = 0): number {
    if (x < 0) x = -x;
    if (y < 0) y = -y;
    if (z < 0) z = -z;

    let xi = Math.floor(x);
    let yi = Math.floor(y);
    let zi = Math.floor(z);

    let xf = x - xi;
    let yf = y - yi;
    let zf = z - zi;

    let rxf: number;
    let ryf: number;

    let r = 0;
    let ampl = 0.5;

    let n1: number;
    let n2: number;
    let n3: number;

    for (let o = 0; o < this.octaves; o++) {
      let of = xi + (yi << PERLIN_YWRAPB) + (zi << PERLIN_ZWRAPB);

      rxf = scaledCosine(xf);
      ryf = scaledCosine(yf);

      n1 = this.perlin[of & PERLIN_SIZE];
      n1 += rxf * (this.perlin[(of + 1) & PERLIN_SIZE] - n1);
      n2 = this.perlin[(of + PERLIN_YWRAP) & PERLIN_SIZE];
      n2 += rxf * (this.perlin[(of + PERLIN_YWRAP + 1) & PERLIN_SIZE] - n2);
      n1 += ryf * (n2 - n1);

      of += PERLIN_ZWRAP;
      n2 = this.perlin[of & PERLIN_SIZE];
      n2 += rxf * (this.perlin[(of + 1) & PERLIN_SIZE] - n2);
      n3 = this.perlin[(of + PERLIN_YWRAP) & PERLIN_SIZE];
      n3 += rxf * (this.perlin[(of + PERLIN_YWRAP + 1) & PERLIN_SIZE] - n3);
      n2 += ryf * (n3 - n2);

      n1 += scaledCosine(zf) * (n2 - n1);

      r += n1 * ampl;
      ampl *= this.ampFalloff;

      xi <<= 1;
      xf *= 2;
      yi <<= 1;
      yf *= 2;
      zi <<= 1;
      zf *= 2;

      if (xf >= 1.0) {
        xi++;
        xf--;
      }
      if (yf >= 1.0) {
        yi++;
        yf--;
      }
      if (zf >= 1.0) {
        zi++;
        zf--;
      }
    }
    return r;
  }
}

/**
 * Perturbs a list of 2D points along a continuous loop or closed path using Perlin noise.
 */
export function loopNoise(
  list: readonly Point2D[],
  noiseInstance: INoise,
  step = 0.05
): Point2D[] {
  if (list.length === 0) return [];
  const result: Point2D[] = [];
  for (let i = 0; i < list.length; i++) {
    const pt = list[i];
    const n = noiseInstance.noise(pt.x * step, pt.y * step);
    result.push({
      x: pt.x + Math.cos(n * Math.PI * 2) * 2,
      y: pt.y + Math.sin(n * Math.PI * 2) * 2
    });
  }
  return result;
}
