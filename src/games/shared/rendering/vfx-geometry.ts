/**
 * Deterministic geometry and dynamics for procedural VFX.
 * No renderer APIs, global RNG, or mutable shared scratch buffers.
 */
import { clamp, finiteNumber, nonNegativeInteger, nonNegativeNumber, positiveNumber } from "./vfx-core";

export interface Point2 { x: number; y: number; }
export interface Fragment { x: number; y: number; vx: number; vy: number; rotation: number; angularVelocity: number; }

export function normalizeAngle(angle: number): number {
  finiteNumber(angle, "angle");
  const tau = Math.PI * 2;
  return ((angle % tau) + tau) % tau;
}

/** Harmonic radial contour, returned as a closed polygon without a duplicate endpoint. */
export function createContour(
  radius: number,
  points: number,
  options: { amplitude?: number; harmonics?: number; rolloff?: number; phase?: number } = {}
): Point2[] {
  positiveNumber(radius, "radius");
  nonNegativeInteger(points, "points");
  if (points < 3) throw new RangeError("points must be at least 3");
  const amplitude = options.amplitude ?? 0;
  const harmonics = options.harmonics ?? 1;
  const rolloff = options.rolloff ?? 1;
  const phase = options.phase ?? 0;
  finiteNumber(amplitude, "amplitude");
  nonNegativeInteger(harmonics, "harmonics");
  positiveNumber(rolloff, "rolloff");
  finiteNumber(phase, "phase");
  if (Math.abs(amplitude) >= rolloff) throw new RangeError("absolute amplitude must be smaller than rolloff to keep radius positive");
  return Array.from({ length: points }, (_, i) => {
    const angle = (i / points) * Math.PI * 2;
    const wave = harmonics === 0 ? 0 : Math.sin(angle * harmonics + phase);
    const r = radius * (1 + amplitude * wave / rolloff);
    return { x: Math.cos(angle) * r, y: Math.sin(angle) * r };
  });
}

/** Star polygon vertices, alternating outer and inner radii. */
export function starPoints(outerRadius: number, innerRadius: number, spikes: number, rotation = -Math.PI / 2): Point2[] {
  positiveNumber(outerRadius, "outerRadius");
  positiveNumber(innerRadius, "innerRadius");
  nonNegativeInteger(spikes, "spikes");
  finiteNumber(rotation, "rotation");
  if (spikes < 2) throw new RangeError("spikes must be at least 2");
  if (innerRadius >= outerRadius) throw new RangeError("innerRadius must be smaller than outerRadius");
  return Array.from({ length: spikes * 2 }, (_, i) => {
    const radius = i % 2 === 0 ? outerRadius : innerRadius;
    const angle = rotation + (i * Math.PI) / spikes;
    return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
  });
}

export function sdfCircle(point: Point2, radius: number): number {
  finiteNumber(point.x, "point.x"); finiteNumber(point.y, "point.y");
  positiveNumber(radius, "radius");
  return Math.hypot(point.x, point.y) - radius;
}

/** Signed distance to an axis-aligned rounded box centered at the origin. */
export function sdfRoundedBox(point: Point2, halfWidth: number, halfHeight: number, radius = 0): number {
  finiteNumber(point.x, "point.x"); finiteNumber(point.y, "point.y");
  positiveNumber(halfWidth, "halfWidth"); positiveNumber(halfHeight, "halfHeight");
  nonNegativeNumber(radius, "radius");
  const r = Math.min(radius, halfWidth, halfHeight);
  const qx = Math.abs(point.x) - halfWidth + r;
  const qy = Math.abs(point.y) - halfHeight + r;
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
}

/** Polynomial smooth minimum. k=0 intentionally reduces to a hard minimum. */
export function sminPoly(a: number, b: number, k: number): number {
  finiteNumber(a, "a"); finiteNumber(b, "b"); nonNegativeNumber(k, "k");
  if (k === 0) return Math.min(a, b);
  const h = clamp(0.5 + 0.5 * (b - a) / k, 0, 1);
  return b * (1 - h) + a * h - k * h * (1 - h);
}

/** Exponential smooth minimum with stable limiting behavior. */
export function sminExp(a: number, b: number, k: number): number {
  finiteNumber(a, "a"); finiteNumber(b, "b"); positiveNumber(k, "k");
  const m = Math.min(a, b);
  return m - Math.log(Math.exp(-k * (a - m)) + Math.exp(-k * (b - m))) / k;
}

/** Closed-form ballistic position under constant gravity and linear drag. */
export function ballistic(
  position: number,
  velocity: number,
  acceleration: number,
  time: number,
  drag = 0
): number {
  finiteNumber(position, "position"); finiteNumber(velocity, "velocity");
  finiteNumber(acceleration, "acceleration"); nonNegativeNumber(time, "time");
  nonNegativeNumber(drag, "drag");
  if (drag === 0) return position + velocity * time + 0.5 * acceleration * time * time;
  const decay = Math.exp(-drag * time);
  const terminal = acceleration / drag;
  return position + terminal * time + (velocity - terminal) * (1 - decay) / drag;
}

export function radiusFromEnergy(energy: number, baseRadius: number, exponent = 0.5): number {
  nonNegativeNumber(energy, "energy"); positiveNumber(baseRadius, "baseRadius");
  positiveNumber(exponent, "exponent");
  return baseRadius * Math.pow(energy, exponent);
}

export function durationFromRadius(radius: number, baseDuration: number, exponent = 0.5): number {
  positiveNumber(radius, "radius"); positiveNumber(baseDuration, "baseDuration");
  positiveNumber(exponent, "exponent");
  return baseDuration * Math.pow(radius, exponent);
}

export function scaleByEnergy(energy: number, minScale: number, maxScale: number, exponent = 0.5): number {
  nonNegativeNumber(energy, "energy"); positiveNumber(minScale, "minScale");
  positiveNumber(maxScale, "maxScale"); positiveNumber(exponent, "exponent");
  if (minScale > maxScale) throw new RangeError("minScale must not exceed maxScale");
  return minScale + (maxScale - minScale) * (1 - Math.exp(-Math.pow(energy, exponent)));
}

/** Deterministic radial fragments. Seed controls direction, speed, spin and initial rotation. */
export function createFragments(count: number, seed: number, speed: number, spread = Math.PI * 2): Fragment[] {
  nonNegativeInteger(count, "count"); nonNegativeInteger(seed, "seed");
  nonNegativeNumber(speed, "speed"); finiteNumber(spread, "spread");
  if (spread < 0 || spread > Math.PI * 2) throw new RangeError("spread must be in [0, 2π]");
  let state = seed >>> 0;
  const next = (): number => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
  return Array.from({ length: count }, () => {
    const angle = (next() - 0.5) * spread;
    const magnitude = speed * (0.65 + next() * 0.7);
    return {
      x: 0, y: 0, vx: Math.cos(angle) * magnitude, vy: Math.sin(angle) * magnitude,
      rotation: next() * Math.PI * 2, angularVelocity: (next() * 2 - 1) * 8
    };
  });
}
