import { COSMIC_ARCADE_PALETTE, hexToRgba } from "./CosmicPalette";
import { CircularPositionBuffer, CircularPositionBufferConfig, TrailBufferPoint } from "./CircularPositionBuffer";

export { CircularPositionBuffer, CircularPositionBufferConfig, TrailBufferPoint };

export interface MotionTrailParams {
  speed: number;
  maxTrailLength: number;
  baseWidth: number;
  coreColor: string;
  glowColor: string;
}

/**
 * Calculates velocity-aligned trail parameters without allocating new objects.
 * Scales trail length based on actual entity velocity.
 */
export function computeTrailParameters(
  vx: number,
  vy: number,
  baseLength: number = 20,
  minSpeedThreshold: number = 0.5
): {
  speed: number;
  angle: number;
  scaledLength: number;
  coreColor: string;
  glowColor: string;
} {
  const speed = Math.sqrt(vx * vx + vy * vy);
  const angle = Math.atan2(vy, vx);

  let scaledLength = 0;
  if (speed >= minSpeedThreshold) {
    scaledLength = Math.min(baseLength * 2.5, baseLength * (speed / 3.0));
  }

  return {
    speed,
    angle,
    scaledLength,
    coreColor: COSMIC_ARCADE_PALETTE.white,
    glowColor: COSMIC_ARCADE_PALETTE.neonCyan
  };
}

/**
 * Calculates thruster plume flame gradient colors.
 */
export function getThrusterFlameColors(): {
  core: string;
  inner: string;
  outer: string;
} {
  return {
    core: COSMIC_ARCADE_PALETTE.white,
    inner: COSMIC_ARCADE_PALETTE.neonCyan,
    outer: hexToRgba(COSMIC_ARCADE_PALETTE.electricIndigo, 0.2)
  };
}
