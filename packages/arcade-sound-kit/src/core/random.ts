export class RNG {
  private state: number;
  constructor(seed = 123456789) {
    this.state = seed >>> 0;
  }
  next() {
    let x = this.state;
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    this.state = x >>> 0;
    return this.state / 0x100000000;
  }
  centered(amount: number) {
    return (this.next() * 2 - 1) * amount;
  }
  range(min: number, max: number) {
    return min + this.next() * (max - min);
  }
  fork(subSeed: number | string = 0): RNG {
    let seedValue = 0;
    if (typeof subSeed === 'number') {
      seedValue = subSeed;
    } else {
      for (let i = 0; i < subSeed.length; i++) {
        seedValue = (seedValue * 31 + subSeed.charCodeAt(i)) | 0;
      }
    }
    const combined = Math.imul(this.state ^ (seedValue >>> 0), 0x9e3779b9);
    const derivedSeed = (combined ^ (combined >>> 16)) >>> 0;
    return new RNG(derivedSeed === 0 ? 0x12345678 : derivedSeed);
  }
}
