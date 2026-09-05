import { colors } from "../../../theme/colors";

/**
 * Pure math helpers for Asteroids visual calculations.
 */

export interface HitFlashPulseState {
  color: string;
  opacity: number;
  isFlashing: boolean;
}

export function calculateHitFlashPulse(
  hitFlashFrames: number | undefined,
  baseColor: string,
  baseOpacity: number = 1.0
): HitFlashPulseState {
  if (hitFlashFrames !== undefined && hitFlashFrames > 0) {
    const isDimmed = (hitFlashFrames >> 1) % 2 === 0;
    return {
      color: colors.white,
      opacity: isDimmed ? 0.3 : baseOpacity,
      isFlashing: true
    };
  }
  return {
    color: baseColor,
    opacity: baseOpacity,
    isFlashing: false
  };
}

export interface InvulnerabilityPulseState {
  opacity: number;
  isInvulnerable: boolean;
}

export function calculateInvulnerabilityPulse(
  remainingTime: number | undefined,
  baseOpacity: number = 1.0
): InvulnerabilityPulseState {
  if (remainingTime !== undefined && remainingTime > 0) {
    const pulse = Math.floor(remainingTime * 10) % 2;
    return {
      opacity: pulse === 0 ? 0.3 : baseOpacity,
      isInvulnerable: true
    };
  }
  return {
    opacity: baseOpacity,
    isInvulnerable: false
  };
}
