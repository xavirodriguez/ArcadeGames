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

export function evalWave(wave: Wave, phase: number, dt = 0): number {
  const p = phase - Math.floor(phase);
  switch (wave) {
    case 'sine':
      return Math.sin(2 * Math.PI * p);
    case 'square': {
      const naive = p < 0.5 ? 1 : -1;
      if (dt <= 0 || dt >= 0.5) return naive;
      return naive + polyBlep(p, dt) - polyBlep((p + 0.5) % 1, dt);
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
