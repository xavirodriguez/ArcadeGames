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
  choice<T>(items: T[]): T {
    const idx = Math.floor(this.next() * items.length);
    return items[Math.min(idx, items.length - 1)];
  }
  fork(identifier: number | string = 0): RNG {
    let hash = this.state >>> 0;
    if (typeof identifier === 'number') {
      hash = (hash ^ ((identifier + 1) * 0x9e3779b9)) >>> 0;
    } else {
      for (let i = 0; i < identifier.length; i++) {
        hash = (Math.imul(31, hash) + identifier.charCodeAt(i)) >>> 0;
      }
    }
    hash ^= hash << 13;
    hash ^= hash >>> 17;
    hash ^= hash << 5;
    return new RNG(hash >>> 0 || 1);
  }
}
