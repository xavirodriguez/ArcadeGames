import { Wave } from '../types';

export function polyBlep(t: number, dt: number): number {
  if (dt >= 0.5) return 0;
  if (t < dt) {
    const x = t / dt;
    return x + x - x * x - 1;
  }
  if (t > 1 - dt) {
    const x = (t - 1) / dt;
    return x * x + x + x + 1;
  }
  return 0;
}

export function evalWave(wave: Wave, phase: number, dt = 0, duty = 0.5): number {
  const p = phase - Math.floor(phase);
  const d = Math.max(0.01, Math.min(0.99, duty));

  switch (wave) {
    case 'sine':
      return Math.sin(2 * Math.PI * p);
    case 'pulse':
    case 'square': {
      const naive = p < d ? 1 : -1;
      if (dt <= 0 || dt >= 0.5) return naive;
      return naive + polyBlep(p, dt) - polyBlep((p + 1 - d) % 1, dt);
    }
    case 'sawtooth': {
      const naive = 2 * p - 1;
      if (dt <= 0 || dt >= 0.5) return naive;
      return naive - polyBlep(p, dt);
    }
    case 'triangle':
      return 2 * Math.abs(2 * (p - Math.floor(p + 0.5))) - 1;
    default:
      return Math.sin(2 * Math.PI * p);
  }
}

export class LfsrNoise {
  private register: number;
  private bits: 7 | 15;

  constructor(bits: 7 | 15 = 15, seed = 1) {
    this.bits = bits;
    this.register = (seed & (bits === 7 ? 0x7f : 0x7fff)) || 1;
  }

  next(): number {
    if (this.bits === 7) {
      // 7-bit LFSR: feedback = bit 6 ^ bit 5 (taps 7, 6 -> 0-based 6, 5)
      const bit6 = (this.register >> 6) & 1;
      const bit5 = (this.register >> 5) & 1;
      const feedback = bit6 ^ bit5;
      this.register = ((this.register << 1) | feedback) & 0x7f;
      return (this.register & 1) * 2 - 1;
    } else {
      // 15-bit LFSR: feedback = bit 14 ^ bit 13 (taps 15, 14 -> 0-based 14, 13)
      const bit14 = (this.register >> 14) & 1;
      const bit13 = (this.register >> 13) & 1;
      const feedback = bit14 ^ bit13;
      this.register = ((this.register << 1) | feedback) & 0x7fff;
      return (this.register & 1) * 2 - 1;
    }
  }
}
