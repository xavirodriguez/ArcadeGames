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
}
