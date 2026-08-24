/**
 * ProceduralShapeUtils.ts
 * Shared pure mathematical helpers for procedural shape rendering across Canvas and Skia backends.
 */

/** Pre-allocated bullet coordinate pool for zero-allocation grid displacement */
export const BULLET_COORDS: { x: number; y: number }[] = Array.from({ length: 100 }, () => ({ x: 0, y: 0 }));

const DISPLACED_COORD = { x: 0, y: 0 };

/**
 * Calculates real-time neon grid point displacement based on player and bullets coordinates.
 * Pure mathematical computation shared between Canvas and Skia renderers.
 *
 * @param x - Grid point X coordinate
 * @param y - Grid point Y coordinate
 * @param px - Player X coordinate
 * @param py - Player Y coordinate
 * @param bulletCoords - Array of active bullet coordinates
 * @param bulletCount - Count of active bullets
 * @returns Displaced coordinate object (reused instance)
 */
export function getDisplacedPoint(
  x: number,
  y: number,
  px: number,
  py: number,
  bulletCoords: typeof BULLET_COORDS,
  bulletCount: number
): { x: number; y: number } {
  let dx = x;
  let dy = y;

  // 1. Player lens bulge deformation
  const pdx = x - px;
  const pdy = y - py;
  const pdist = Math.sqrt(pdx * pdx + pdy * pdy);
  if (pdist < 140 && pdist > 0.1) {
    const factor = (140 - pdist) / 140;
    const displacement = 20 * factor * factor;
    dx += (pdx / pdist) * displacement;
    dy += (pdy / pdist) * displacement;
  }

  // 2. Active bullets gravity ripple deformation
  for (let i = 0; i < bulletCount; i++) {
    const bx = bulletCoords[i].x;
    const by = bulletCoords[i].y;
    const bdx = x - bx;
    const bdy = y - by;
    const bdist = Math.sqrt(bdx * bdx + bdy * bdy);
    if (bdist < 60 && bdist > 0.1) {
      const bFactor = (60 - bdist) / 60;
      const bDisplacement = 12 * bFactor * bFactor;
      dx += (bdx / bdist) * bDisplacement;
      dy += (bdy / bdist) * bDisplacement;
    }
  }

  DISPLACED_COORD.x = dx;
  DISPLACED_COORD.y = dy;
  return DISPLACED_COORD;
}

/**
 * Computes procedural jagged asteroid silhouette vertices deterministically using LCG.
 *
 * @param entitySeed - Unique entity seed identifier
 * @param radius - Base radius of the asteroid
 * @param numPoints - Number of perimeter vertices to calculate
 * @returns Array of relative 2D point offsets \{ x, y \}
 */
export function computeAsteroidSilhouette(
  entitySeed: number,
  radius: number,
  numPoints: number
): { x: number; y: number }[] {
  const points: { x: number; y: number }[] = [];
  let s = entitySeed + 45000;

  for (let i = 0; i < numPoints; i++) {
    const angle = (i / numPoints) * Math.PI * 2;

    s = (s * 1664525 + 1013904223) % 4294967296;
    const rngValue = s / 4294967296;

    const offsetFactor = rngValue * 0.35 - 0.175;
    const currentRadius = radius * (1.0 + offsetFactor);
    const x = Math.cos(angle) * currentRadius;
    const y = Math.sin(angle) * currentRadius;

    points.push({ x, y });
  }

  return points;
}

/** Calculated thrust flame geometry data and exhaust spark positions */
export interface ThrustFlameData {
  flameLen: number;
  sparks: { sparkOffset: number; sparkY: number; sparkRadius: number }[];
}

/**
 * Computes thruster flame length and lingering hot plasma exhaust spark positions deterministically.
 *
 * @param size - Ship size parameter
 * @param rng - Deterministic random number generator instance (world.renderRandom)
 * @returns ThrustFlameData object with flame length and array of sparks
 */
export function computeThrustFlame(
  size: number,
  rng: { next: () => number; nextRange: (min: number, max: number) => number }
): ThrustFlameData {
  const flicker = 1.0 + 0.3 * (rng.next() - 0.5);
  const flameLen = size * 1.5 * flicker;

  const sparks: { sparkOffset: number; sparkY: number; sparkRadius: number }[] = [];
  for (let i = 0; i < 3; i++) {
    const sparkOffset = flameLen + rng.nextRange(2, 8);
    const sparkY = rng.nextRange(-size * 0.2, size * 0.2);
    const sparkRadius = rng.nextRange(1, 2);
    sparks.push({ sparkOffset, sparkY, sparkRadius });
  }

  return { flameLen, sparks };
}

/** Calculated FlappyBird thruster flame dimensions */
export interface FlappyThrusterFlameData {
  flameLength: number;
  flameWidth: number;
}

/**
 * Computes FlappyBird thermonuclear reactive thruster flame length and width based on velocity and tick flicker.
 *
 * @param size - Ship size parameter
 * @param vy - Vertical velocity of the ship (vy < 0 means boosting)
 * @param tick - World simulation tick
 * @returns FlappyThrusterFlameData with flameLength and flameWidth
 */
export function computeFlappyThrusterFlame(
  size: number,
  vy: number,
  tick: number
): FlappyThrusterFlameData {
  const isBoosting = vy < 0;
  const flicker = 0.85 + 0.15 * Math.sin(tick * 0.8);
  const flameLength = (isBoosting ? size * 1.6 : size * 0.75) * flicker;
  const flameWidth = (isBoosting ? size * 0.55 : size * 0.3) * flicker;
  return { flameLength, flameWidth };
}

/**
 * Calculates the standard neon glow pulsing scale factor deterministically based on tick count.
 *
 * @param tick - World simulation tick
 * @returns Pulse scale factor (around 1.0 with 8% sinusoidal variance)
 */
export function computeNeonPulse(tick: number): number {
  return 1.0 + 0.08 * Math.sin(tick / 6);
}
