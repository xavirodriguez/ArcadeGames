export interface VisualExplosionParticle {
  active: boolean;
  type: "ring" | "debris" | "smoke";
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number; // For expanding rings
  maxRadius: number;
  size: number;
  life: number;
  maxLife: number;
  color: string;
  skColor?: any;
}

const EXPLOSION_POOL_SIZE = 300;
export const EXPLOSION_PARTICLE_POOL: VisualExplosionParticle[] = Array.from({ length: EXPLOSION_POOL_SIZE }, () => ({
  active: false,
  type: "debris",
  x: 0,
  y: 0,
  vx: 0,
  vy: 0,
  radius: 0,
  maxRadius: 0,
  size: 0,
  life: 0,
  maxLife: 0,
  color: "#FFFFFF"
}));

export function spawnLayeredExplosion(
  x: number,
  y: number,
  baseColor: string = "#00FFFF",
  intensityMultiplier: number = 1.0
): void {
  const pseudoRand = (seed: number) => {
    const xVal = Math.sin(seed) * 10000;
    return xVal - Math.floor(xVal);
  };

  let seedIndex = x * 1000 + y;

  const nextRnd = () => {
    seedIndex += 1.357;
    return pseudoRand(seedIndex);
  };

  // Layer 2: Expanding Ring
  const ringP = EXPLOSION_PARTICLE_POOL.find(p => !p.active);
  if (ringP) {
    ringP.active = true;
    ringP.type = "ring";
    ringP.x = x;
    ringP.y = y;
    ringP.vx = 0;
    ringP.vy = 0;
    ringP.radius = 2;
    ringP.maxRadius = (35 + nextRnd() * 25) * intensityMultiplier;
    ringP.size = 2;
    ringP.life = 0.35 * intensityMultiplier;
    ringP.maxLife = ringP.life;
    ringP.color = baseColor;
  }

  // Layer 3: Debris with gravity
  const debrisCount = Math.floor((12 + nextRnd() * 8) * intensityMultiplier);
  for (let i = 0; i < debrisCount; i++) {
    const p = EXPLOSION_PARTICLE_POOL.find(part => !part.active);
    if (p) {
      const angle = nextRnd() * Math.PI * 2;
      const speed = (60 + nextRnd() * 180) * intensityMultiplier;
      p.active = true;
      p.type = "debris";
      p.x = x;
      p.y = y;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed - 30; // slight initial upward velocity
      p.size = 2 + nextRnd() * 3.5;
      p.life = (0.4 + nextRnd() * 0.4) * intensityMultiplier;
      p.maxLife = p.life;
      p.color = nextRnd() > 0.4 ? baseColor : "#FFFFFF";
    }
  }

  // Layer 4: Residual smoke
  const smokeCount = Math.floor((6 + nextRnd() * 6) * intensityMultiplier);
  for (let i = 0; i < smokeCount; i++) {
    const p = EXPLOSION_PARTICLE_POOL.find(part => !part.active);
    if (p) {
      const angle = nextRnd() * Math.PI * 2;
      const speed = (15 + nextRnd() * 40) * intensityMultiplier;
      p.active = true;
      p.type = "smoke";
      p.x = x;
      p.y = y;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed - 15; // gentle smoke drift upward
      p.size = 4 + nextRnd() * 6;
      p.life = (0.8 + nextRnd() * 0.6) * intensityMultiplier;
      p.maxLife = p.life;
      p.color = "#888888";
    }
  }
}

export function updateExplosionParticles(dt: number = 0.016): void {
  const gravity = 250; // gravity on debris
  for (let i = 0; i < EXPLOSION_PARTICLE_POOL.length; i++) {
    const p = EXPLOSION_PARTICLE_POOL[i];
    if (p.active) {
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        continue;
      }

      if (p.type === "ring") {
        const progress = 1.0 - p.life / p.maxLife;
        p.radius = p.maxRadius * progress;
      } else if (p.type === "debris") {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += gravity * dt; // Gravity pull
        p.vx *= 0.96; // drag
      } else if (p.type === "smoke") {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vx *= 0.92;
        p.vy *= 0.92;
        p.size += dt * 8; // expanding smoke cloud
      }
    }
  }
}
