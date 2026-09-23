import { createParticlePool, VisualParticlePool } from "../../shared/rendering/VisualParticlePool";
import { applyFlappyParticlePhysics } from "./particleEvents";

/**
 * Shared zero-allocation pre-allocated visual particle pool for Flappy Bird (Canvas & Skia).
 */
export const FLAPPY_PARTICLE_POOL: VisualParticlePool = createParticlePool(150);

export function spawnVisualParticle(
  type: "spark" | "shard" | "star",
  x: number,
  y: number,
  vx: number,
  vy: number,
  maxLife: number,
  size: number,
  color: string,
  angle = 0,
  angularVelocity = 0
): void {
  FLAPPY_PARTICLE_POOL.spawn(x, y, vx, vy, maxLife, size, color, { type, angle, angularVelocity });
}

export function updateVisualParticles(): void {
  FLAPPY_PARTICLE_POOL.update(0.016, applyFlappyParticlePhysics);
}

export interface ActiveFlappyParticleData {
  active: boolean;
  type: "spark" | "shard" | "star";
  x: number;
  y: number;
  size: number;
  color: string;
  skColor?: any;
  angle?: number;
  ratio: number;
}

export function resolveFlappyParticleData(p: {
  active: boolean;
  type?: string;
  x: number;
  y: number;
  size: number;
  color: string;
  skColor?: any;
  angle?: number;
  life: number;
  maxLife: number;
}): ActiveFlappyParticleData | null {
  if (!p.active) return null;
  const ratio = p.life / p.maxLife;
  return {
    active: true,
    type: (p.type as "spark" | "shard" | "star") || "spark",
    x: p.x,
    y: p.y,
    size: p.size,
    color: p.color,
    skColor: p.skColor,
    angle: p.angle,
    ratio,
  };
}
