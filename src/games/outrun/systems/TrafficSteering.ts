/**
 * Pure traffic steering helpers (Session 4).
 * Deterministic, allocation-light, no ECS / Math.random.
 */

export interface TrafficObstacle {
  z: number;
  lateralX: number;
  speed: number;
}

/** Shortest signed delta on a circular track of length L (result in (-L/2, L/2]). */
export function circularDeltaZ(fromZ: number, toZ: number, trackLength: number): number {
  if (trackLength <= 0) return toZ - fromZ;
  let d = toZ - fromZ;
  while (d > trackLength * 0.5) d -= trackLength;
  while (d < -trackLength * 0.5) d += trackLength;
  return d;
}

/**
 * Compute lateral steering delta for one racer given obstacles ahead.
 *
 * @returns signed delta to add to lateralX this frame (already scaled by dt)
 */
export function computeTrafficSteerDelta(
  selfZ: number,
  selfLateralX: number,
  selfSpeed: number,
  obstacles: readonly TrafficObstacle[],
  trackLength: number,
  lookaheadDist: number,
  avoidRadius: number,
  steerSpeed: number,
  deltaTime: number
): number {
  if (lookaheadDist <= 0 || steerSpeed <= 0 || deltaTime <= 0) return 0;

  let closestDz = lookaheadDist + 1;
  let threatLateral = 0;
  let found = false;

  for (let i = 0; i < obstacles.length; i++) {
    const o = obstacles[i];
    const dz = circularDeltaZ(selfZ, o.z, trackLength);
    if (dz <= 0 || dz > lookaheadDist) continue;
    if (Math.abs(o.lateralX - selfLateralX) > avoidRadius) continue;
    if (o.speed > selfSpeed + 1e-6) continue;
    if (dz < closestDz) {
      closestDz = dz;
      threatLateral = o.lateralX;
      found = true;
    }
  }

  if (!found) return 0;

  const spaceLeft = selfLateralX - -1;
  const spaceRight = 1 - selfLateralX;
  let dir: number;
  if (Math.abs(spaceLeft - spaceRight) < 0.05) {
    dir = selfLateralX >= threatLateral ? 1 : -1;
  } else {
    dir = spaceLeft > spaceRight ? -1 : 1;
  }

  const proximity = 1 - closestDz / lookaheadDist;
  const strength = proximity < 0 ? 0 : proximity > 1 ? 1 : proximity;
  return dir * steerSpeed * strength * deltaTime;
}

export function clampLateralX(x: number, min = -2, max = 2): number {
  return x < min ? min : x > max ? max : x;
}

/**
 * Centrifugal lateral delta for one frame (matches RoadAdvanceSystem formula).
 * Positive curve → negative playerX drift.
 */
export function centrifugalDelta(
  curve: number,
  speed: number,
  maxSpeed: number,
  centrifugalForce: number,
  deltaTime: number
): number {
  if (maxSpeed <= 0) return 0;
  const speedRatio = speed / maxSpeed;
  return -(curve * centrifugalForce * speedRatio * speedRatio * deltaTime);
}

export function maxRelativeTravelPerFrame(
  maxSpeed: number,
  deltaTime: number
): number {
  return Math.abs(maxSpeed) * Math.max(0, deltaTime);
}
