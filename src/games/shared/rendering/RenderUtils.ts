import { colors } from "../../../theme/colors";

/**
 * Interface representing any object or component with optional hitFlashFrames.
 * @public
 */
export interface RenderLike {
  hitFlashFrames?: number;
}

/**
 * Result structure returned by resolveHitFlash.
 * @public
 */
export interface HitFlashState {
  color: string;
  opacity: number;
  isFlashing: boolean;
}

/**
 * Resolves hit-flash color and opacity based on hitFlashFrames.
 *
 * @param render - Object containing hitFlashFrames property.
 * @param baseColor - Original entity color.
 * @param baseOpacity - Original entity opacity (defaults to 1.0).
 * @param dimOpacity - Opacity when flashing in dimmed frame (defaults to 0.3).
 * @returns Object with resolved color, opacity, and isFlashing flag.
 * @public
 */
export function resolveHitFlash(
  render: RenderLike | undefined | null,
  baseColor: string,
  baseOpacity: number = 1.0,
  dimOpacity: number = 0.3
): HitFlashState {
  if (render && render.hitFlashFrames !== undefined && render.hitFlashFrames > 0) {
    const isDimmed = (render.hitFlashFrames >> 1) % 2 === 0;
    return {
      color: colors.white,
      opacity: isDimmed ? dimOpacity : baseOpacity,
      isFlashing: true
    };
  }
  return {
    color: baseColor,
    opacity: baseOpacity,
    isFlashing: false
  };
}

/**
 * Result structure returned by resolveInvulnerabilityPulse.
 * @public
 */
export interface InvulnerabilityPulseState {
  opacity: number;
  isInvulnerable: boolean;
}

/**
 * Resolves invulnerability opacity pulse.
 * Supports time-based pulsing (Asteroids) and tick-based / interval-based pulsing (Space Invaders, Geometry Wars, EchoRunner).
 *
 * @param remaining - Remaining invulnerability duration (seconds or milliseconds) or pulse metric.
 * @param baseOpacity - Base entity opacity (defaults to 1.0).
 * @param options - Optional configuration for pulse formula (mode, divisor, multiplier, dimOpacity).
 * @returns Object containing resolved opacity and isInvulnerable status flag.
 * @public
 */
export function resolveInvulnerabilityPulse(
  remaining: number | undefined | null,
  baseOpacity: number = 1.0,
  options?: {
    /** "time" for remaining seconds (Asteroids style), "tick" for discrete world ticks, or "interval" for ms/counter intervals. Default "time". */
    mode?: "time" | "tick" | "interval";
    /** World tick number when mode is "tick". */
    tick?: number;
    /** Divisor for tick mode (e.g., tick / 4). Default 4. */
    pulseDivisor?: number;
    /** Multiplier for time/interval mode (e.g. remaining * 10 or remaining / 100). Default 10. */
    multiplier?: number;
    /** Opacity during dimmed pulse phase. Default 0.3. */
    dimOpacity?: number;
  }
): InvulnerabilityPulseState {
  if (remaining === undefined || remaining === null || remaining <= 0) {
    return {
      opacity: baseOpacity,
      isInvulnerable: false
    };
  }

  const mode = options?.mode ?? "time";
  const dimOpacity = options?.dimOpacity ?? 0.3;

  let pulse = 0;
  if (mode === "tick") {
    const currentTick = options?.tick ?? 0;
    const divisor = options?.pulseDivisor ?? 4;
    pulse = Math.floor(currentTick / divisor) % 2;
  } else if (mode === "interval") {
    const mult = options?.multiplier ?? 0.01; // e.g. 1/100 for FlappyBird
    pulse = Math.floor(remaining * mult) % 2;
  } else {
    // "time" mode: Asteroids remaining seconds * 10
    const mult = options?.multiplier ?? 10;
    pulse = Math.floor(remaining * mult) % 2;
  }

  return {
    opacity: pulse === 0 ? dimOpacity : baseOpacity,
    isInvulnerable: true
  };
}
