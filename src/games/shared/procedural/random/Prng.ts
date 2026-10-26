/**
 * Encapsulated, deterministic Pseudo-Random Number Generator (PRNG).
 * Ported from Shan Shui (index(1).html) and updated for strict TypeScript without Math.random() reliance.
 */

export type SerializableValue = string | number | boolean | object | null | undefined;

export interface IPrng {
  next(): number;
  seed(s: number | string): void;
  hash(v: SerializableValue): number;
  fork(subKey?: string | number): IPrng;
  test(f?: () => number): number[];
}

export class Prng implements IPrng {
  private s = 1234;
  private readonly p = 999979;
  private readonly q = 999983;
  private readonly m = 999979 * 999983;

  constructor(initialSeed?: number | string) {
    if (initialSeed !== undefined) {
      this.seed(initialSeed);
    }
  }

  public hash(v: SerializableValue): number {
    const str = typeof v === "string" ? v : JSON.stringify(v) ?? String(v);
    let z = 0;
    for (let i = 0; i < str.length; i++) {
      z = (z * 31 + str.charCodeAt(i)) & 0x7fffffff;
    }
    return z;
  }

  public seed(x: number | string): void {
    const numericX = typeof x === "number" ? Math.floor(Math.abs(x)) : this.hash(x);
    let y = 0;
    let z = 0;
    const redo = () => {
      y = (this.hash(numericX + z) + z) % this.m;
      z += 1;
    };
    while (y % this.p === 0 || y % this.q === 0 || y === 0 || y === 1) {
      redo();
      if (z > 1000) {
        y = 12345;
        break;
      }
    }
    this.s = y;
    for (let i = 0; i < 10; i++) {
      this.next();
    }
  }

  public next(): number {
    this.s = (this.s * this.s) % this.m;
    return this.s / this.m;
  }

  public fork(subKey: string | number = 0): IPrng {
    const subHash = typeof subKey === "number" ? subKey : this.hash(subKey);
    const derivedSeed = (subHash + Math.floor(this.next() * 1000000)) % this.m;
    return new Prng(derivedSeed);
  }

  public test(f?: () => number): number[] {
    const sampleFn = f ?? (() => this.next());
    const chart = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    for (let i = 0; i < 100000; i++) {
      const val = sampleFn();
      const bucket = Math.min(9, Math.max(0, Math.floor(val * 10)));
      chart[bucket]++;
    }
    return chart;
  }
}
