export interface SlipResult {
  forwardSpeed: number;
  lateralSpeed: number;
  totalSpeed: number;
  slipLevel: 0 | 1 | 2; // 0 = none, 1 = medium (skid marks), 2 = high (dark skid + smoke)
}

/**
 * Pure function decomposing velocity into forward and lateral speed components,
 * determining drifting slip intensity based on lateral speed thresholds.
 */
export function computeSlip(
  velocity: { vx: number; vy: number },
  rotation: number
): SlipResult {
  const forwardX = Math.cos(rotation);
  const forwardY = Math.sin(rotation);

  const lateralX = -Math.sin(rotation);
  const lateralY = Math.cos(rotation);

  const forwardSpeed = velocity.vx * forwardX + velocity.vy * forwardY;
  const lateralSpeed = Math.abs(velocity.vx * lateralX + velocity.vy * lateralY);
  const totalSpeed = Math.hypot(velocity.vx, velocity.vy);

  let slipLevel: 0 | 1 | 2 = 0;
  if (lateralSpeed >= 90) {
    slipLevel = 2;
  } else if (lateralSpeed >= 30) {
    slipLevel = 1;
  }

  return {
    forwardSpeed,
    lateralSpeed,
    totalSpeed,
    slipLevel
  };
}
