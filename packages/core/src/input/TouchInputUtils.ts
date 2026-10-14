/**
 * Pure input transformation and normalization utility functions for touch controls.
 * @public
 */

/**
 * Clamps a numerical value between a minimum and maximum threshold.
 * @public
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Applies a linear deadzone threshold to a 1D scalar value.
 * @public
 */
export function applyDeadzone(value: number, deadzone: number): number {
  const absVal = Math.abs(value);
  if (absVal <= deadzone) {
    return 0;
  }
  const norm = (absVal - deadzone) / (1 - deadzone);
  const clamped = clamp(norm, 0, 1);
  return Math.sign(value) * clamped;
}

/**
 * Applies a radial deadzone threshold to a 2D axis vector.
 * @public
 */
export function applyDeadzone2D(
  x: number,
  y: number,
  deadzone: number
): { x: number; y: number } {
  const dist = Math.sqrt(x * x + y * y);
  if (dist <= deadzone || dist === 0) {
    return { x: 0, y: 0 };
  }
  const norm = Math.min(1.0, (dist - deadzone) / (1 - deadzone));
  const angle = Math.atan2(y, x);
  return {
    x: norm * Math.cos(angle),
    y: norm * Math.sin(angle),
  };
}

/**
 * Normalizes a raw positional value within [min, max] to a [-1, 1] range.
 * @public
 */
export function normalizeAxis(value: number, min: number, max: number): number {
  if (max === min) return 0;
  const t = (value - min) / (max - min);
  return clamp(t * 2 - 1, -1, 1);
}

/**
 * Snaps a 2D axis vector to 4 cardinal or 8 cardinal/diagonal directions.
 * @public
 */
export function snapDirections(
  x: number,
  y: number,
  count: 4 | 8
): { x: number; y: number } {
  const dist = Math.sqrt(x * x + y * y);
  if (dist === 0) {
    return { x: 0, y: 0 };
  }

  const step = (Math.PI * 2) / count;
  const angle = Math.atan2(y, x);
  const snappedAngle = Math.round(angle / step) * step;

  return {
    x: Math.cos(snappedAngle) * dist,
    y: Math.sin(snappedAngle) * dist,
  };
}

/**
 * Maps finger screen coordinates into clamped paddle/pointer position within specified bounds.
 * @public
 */
export function mapFingerToPaddle(
  fingerX: number,
  fingerY: number,
  bounds: { minX: number; maxX: number; minY?: number; maxY?: number }
): { x: number; y: number } {
  const x = clamp(fingerX, bounds.minX, bounds.maxX);
  const y =
    bounds.minY !== undefined && bounds.maxY !== undefined
      ? clamp(fingerY, bounds.minY, bounds.maxY)
      : fingerY;

  return { x, y };
}

/**
 * Calculates the shortest signed angular difference from one angle to another in radians.
 * Result is in the range [-Math.PI, Math.PI].
 * @public
 */
export function shortestAngleDifference(fromAngle: number, toAngle: number): number {
  let diff = (toAngle - fromAngle) % (Math.PI * 2);
  if (diff > Math.PI) {
    diff -= Math.PI * 2;
  } else if (diff < -Math.PI) {
    diff += Math.PI * 2;
  }
  return diff;
}

/**
 * Rotates an angle towards a target angle by at most `maxRotationStep` radians using the shortest path.
 * Returns the new angle normalized to [-Math.PI, Math.PI].
 * @public
 */
export function rotateTowardsAngle(
  currentAngle: number,
  targetAngle: number,
  maxRotationStep: number
): number {
  const diff = shortestAngleDifference(currentAngle, targetAngle);
  const step = clamp(diff, -maxRotationStep, maxRotationStep);
  let result = currentAngle + step;
  if (result > Math.PI) {
    result -= Math.PI * 2;
  } else if (result < -Math.PI) {
    result += Math.PI * 2;
  }
  return result;
}

/**
 * Applies a power curve response (e.g. value^exponent) while preserving sign.
 * Useful for non-linear control sensitivity on analog joysticks.
 * @public
 */
export function applyPowerResponseCurve(value: number, exponent: number = 2): number {
  const clamped = clamp(value, -1, 1);
  return Math.sign(clamped) * Math.pow(Math.abs(clamped), exponent);
}

/**
 * Computes framerate-independent velocity decay (drag): v * (dragFactor ^ dt).
 * @public
 */
export function applyFramerateIndependentDrag(
  velocity: number,
  dragFactor: number,
  dt: number
): number {
  return velocity * Math.pow(dragFactor, dt);
}

/**
 * Snaps a 2D axis vector (x, y) to one of 8 directions with asymmetric diagonal sector widths and optional boundary hysteresis.
 * @public
 */
export function snapTo8WayAsymmetric(
  x: number,
  y: number,
  diagonalSectorAngleRad: number = Math.PI / 3, // 60 degrees for diagonals, 30 for cardinals
  hysteresisRad: number = 0.05,
  currentSector: number = -1
): { aimX: number; aimY: number; sector: number } {
  const dist = Math.sqrt(x * x + y * y);
  if (dist === 0) {
    return { aimX: 0, aimY: 0, sector: -1 };
  }

  // Angle in [-PI, PI], 0 is Right, PI/2 is Down, -PI/2 is Up
  let angle = Math.atan2(y, x);

  // Normalise angle to [0, 2*PI)
  if (angle < 0) {
    angle += Math.PI * 2;
  }

  // 8 Sectors: 0=E, 1=SE, 2=S, 3=SW, 4=W, 5=NW, 6=N, 7=NE
  const cardinalAngle = (Math.PI * 2 - 4 * diagonalSectorAngleRad) / 4;
  const halfCard = cardinalAngle / 2;

  // 8 Boundaries for 8 sectors starting from East
  const b0 = halfCard;
  const b1 = b0 + diagonalSectorAngleRad;
  const b2 = b1 + cardinalAngle;
  const b3 = b2 + diagonalSectorAngleRad;
  const b4 = b3 + cardinalAngle;
  const b5 = b4 + diagonalSectorAngleRad;
  const b6 = b5 + cardinalAngle;
  const b7 = b6 + diagonalSectorAngleRad;

  let chosenSector = 0;
  if (angle >= b7 || angle < b0) {
    chosenSector = 0; // East
  } else if (angle < b1) {
    chosenSector = 1; // SE
  } else if (angle < b2) {
    chosenSector = 2; // South
  } else if (angle < b3) {
    chosenSector = 3; // SW
  } else if (angle < b4) {
    chosenSector = 4; // West
  } else if (angle < b5) {
    chosenSector = 5; // NW
  } else if (angle < b6) {
    chosenSector = 6; // North
  } else {
    chosenSector = 7; // NE
  }

  const DIAG = Math.SQRT1_2;
  const sectorVectors = [
    { aimX: 1, aimY: 0 },
    { aimX: DIAG, aimY: DIAG },
    { aimX: 0, aimY: 1 },
    { aimX: -DIAG, aimY: DIAG },
    { aimX: -1, aimY: 0 },
    { aimX: -DIAG, aimY: -DIAG },
    { aimX: 0, aimY: -1 },
    { aimX: DIAG, aimY: -DIAG }
  ];

  const vec = sectorVectors[chosenSector];
  return { aimX: vec.aimX, aimY: vec.aimY, sector: chosenSector };
}
