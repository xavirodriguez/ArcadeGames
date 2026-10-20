export class BiquadFilter {
  private x1 = 0;
  private x2 = 0;
  private y1 = 0;
  private y2 = 0;

  private b0 = 1;
  private b1 = 0;
  private b2 = 0;
  private a1 = 0;
  private a2 = 0;

  private lastFreq = -1;
  private lastType = '';
  private lastSR = -1;
  private lastQ = -1;

  public getCoefficients() {
    return { b0: this.b0, b1: this.b1, b2: this.b2, a1: this.a1, a2: this.a2 };
  }

  update(
    type: 'lowpass' | 'highpass' | 'bandpass' | 'notch',
    freq: number,
    sampleRate: number,
    Q = 0.7071067811865475
  ) {
    if (
      type === this.lastType &&
      freq === this.lastFreq &&
      sampleRate === this.lastSR &&
      Q === this.lastQ
    ) {
      return;
    }

    this.lastType = type;
    this.lastFreq = freq;
    this.lastSR = sampleRate;
    this.lastQ = Q;

    const nyquist = sampleRate / 2;
    const f0 = Math.max(10, Math.min(freq, nyquist - 20));
    const omega0 = (2 * Math.PI * f0) / sampleRate;
    const cosW = Math.cos(omega0);
    const sinW = Math.sin(omega0);
    const alpha = sinW / (2 * Math.max(0.001, Q));

    let b0 = 0,
      b1 = 0,
      b2 = 0,
      a0 = 1,
      a1 = 0,
      a2 = 0;

    if (type === 'highpass') {
      b0 = (1 + cosW) / 2;
      b1 = -(1 + cosW);
      b2 = (1 + cosW) / 2;
      a0 = 1 + alpha;
      a1 = -2 * cosW;
      a2 = 1 - alpha;
    } else if (type === 'bandpass') {
      b0 = alpha;
      b1 = 0;
      b2 = -alpha;
      a0 = 1 + alpha;
      a1 = -2 * cosW;
      a2 = 1 - alpha;
    } else if (type === 'notch') {
      b0 = 1;
      b1 = -2 * cosW;
      b2 = 1;
      a0 = 1 + alpha;
      a1 = -2 * cosW;
      a2 = 1 - alpha;
    } else {
      // lowpass
      b0 = (1 - cosW) / 2;
      b1 = 1 - cosW;
      b2 = (1 - cosW) / 2;
      a0 = 1 + alpha;
      a1 = -2 * cosW;
      a2 = 1 - alpha;
    }

    this.b0 = b0 / a0;
    this.b1 = b1 / a0;
    this.b2 = b2 / a0;
    this.a1 = a1 / a0;
    this.a2 = a2 / a0;
  }

  process(x: number): number {
    const y =
      this.b0 * x +
      this.b1 * this.x1 +
      this.b2 * this.x2 -
      this.a1 * this.y1 -
      this.a2 * this.y2;
    this.x2 = this.x1;
    this.x1 = x;
    this.y2 = this.y1;
    this.y1 = y;
    return y;
  }
}
