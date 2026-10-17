/**
 * ProceduralShapeUtils.ts
 * Shared pure mathematical helpers for procedural shape rendering across Canvas and Skia backends.
 */

import { colors } from "../../../theme/colors";

/** Pre-allocated bullet coordinate pool for zero-allocation grid displacement */
export const BULLET_COORDS: { x: number; y: number }[] = Array.from({ length: 100 }, () => ({ x: 0, y: 0 }));

const DISPLACED_COORD = { x: 0, y: 0 };

/**
 * Calculates real-time neon grid point displacement based on player and bullets coordinates.
 * Pure mathematical computation shared between Canvas and Skia renderers.
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

/** Motion secondary particle structure for Concept Pack exhaust and movement trail rendering */
export interface MotionParticle {
  offsetX: number;
  offsetY: number;
  radius: number;
  alpha: number;
  color: string;
}

/** Data packet for generalized secondary motion effects (flame, exhaust_smoke, dust_trail) */
export interface MotionEffectData {
  effectType: "flame" | "exhaust_smoke" | "dust_trail" | "none";
  length: number;
  particles: MotionParticle[];
}

/**
 * Generalizes secondary movement effects across concept packs ("flame", "exhaust_smoke", "dust_trail").
 */
export function computeMotionSecondaryEffect(
  effectType: "flame" | "exhaust_smoke" | "dust_trail" | "none",
  size: number,
  tick: number,
  rng?: { next: () => number; nextRange: (min: number, max: number) => number }
): MotionEffectData {
  if (effectType === "none") {
    return { effectType: "none", length: 0, particles: [] };
  }

  const nextRng = rng?.next ? rng.next : () => Math.random();
  const flicker = 0.85 + 0.3 * (nextRng() - 0.5);
  const length = size * 1.4 * flicker;
  const particles: MotionParticle[] = [];

  if (effectType === "exhaust_smoke") {
    // Heavy engine exhaust puff clouds
    for (let i = 0; i < 4; i++) {
      const offsetX = -size * 0.5 - (i * length * 0.3);
      const offsetY = ((nextRng() - 0.5) * size * 0.4);
      const radius = Math.max(1.5, (i + 1) * 2.2);
      const alpha = Math.max(0.1, 0.7 - i * 0.15);
      particles.push({
        offsetX,
        offsetY,
        radius,
        alpha,
        color: i === 0 ? colors.orange : colors.slate,
      });
    }
  } else if (effectType === "dust_trail") {
    // Footstep ground dust trail clouds
    for (let i = 0; i < 3; i++) {
      const offsetX = -size * 0.3 - (i * length * 0.25);
      const offsetY = ((nextRng() - 0.5) * size * 0.5);
      const radius = Math.max(1.0, (i + 1) * 1.8);
      const alpha = Math.max(0.1, 0.5 - i * 0.15);
      particles.push({
        offsetX,
        offsetY,
        radius,
        alpha,
        color: colors.amber,
      });
    }
  } else {
    // Default neon thruster flame
    const flameData = computeThrustFlame(size, rng || { next: () => 0.5, nextRange: (a, b) => (a + b) / 2 });
    for (let i = 0; i < flameData.sparks.length; i++) {
      const s = flameData.sparks[i];
      particles.push({
        offsetX: -(size * 0.4 + s.sparkOffset),
        offsetY: s.sparkY,
        radius: s.sparkRadius,
        alpha: 0.8,
        color: colors.gold,
      });
    }
  }

  return { effectType, length, particles };
}

/** Calculated FlappyBird thruster flame dimensions */
export interface FlappyThrusterFlameData {
  flameLength: number;
  flameWidth: number;
}

/**
 * Computes FlappyBird thermonuclear reactive thruster flame length and width based on velocity and tick flicker.
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
 */
export function computeNeonPulse(tick: number): number {
  return 1.0 + 0.08 * Math.sin(tick / 6);
}
