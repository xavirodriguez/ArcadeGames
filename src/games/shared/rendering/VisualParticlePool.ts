import { Skia } from "./SkiaContext";

/**
 * Common superset interface for visual particles.
 * @public
 */
export interface VisualParticle {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  type?: string;
  angle?: number;
  angularVelocity?: number;
  skColor?: any;
}

/**
 * Reusable zero-allocation visual particle pool with optional physics injection.
 * @public
 */
export class VisualParticlePool {
  private pool: VisualParticle[];

  constructor(size: number = 200) {
    this.pool = Array.from({ length: size }, () => ({
      active: false,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      life: 0,
      maxLife: 0,
      size: 0,
      color: ""
    }));
  }

  public spawn(
    x: number,
    y: number,
    vx: number,
    vy: number,
    maxLife: number,
    size: number,
    color: string,
    extra?: { type?: string; angle?: number; angularVelocity?: number }
  ): void {
    for (let i = 0; i < this.pool.length; i++) {
      const p = this.pool[i];
      if (!p.active) {
        p.active = true;
        p.x = x;
        p.y = y;
        p.vx = vx;
        p.vy = vy;
        p.life = maxLife;
        p.maxLife = maxLife;
        p.size = size;
        p.color = color;
        p.type = extra?.type;
        p.angle = extra?.angle ?? 0;
        p.angularVelocity = extra?.angularVelocity ?? 0;
        p.skColor = Skia ? Skia.Color(color) : null;
        break;
      }
    }
  }

  public update(dt: number = 0.016, applyPhysics?: (p: VisualParticle, dt: number) => void): void {
    for (let i = 0; i < this.pool.length; i++) {
      const p = this.pool[i];
      if (!p.active) continue;

      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        continue;
      }

      if (applyPhysics) {
        applyPhysics(p, dt);
      } else {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        if (p.angle !== undefined && p.angularVelocity) {
          p.angle += p.angularVelocity * dt;
        }
      }
    }
  }

  public getActiveParticles(): VisualParticle[] {
    return this.pool;
  }
}
