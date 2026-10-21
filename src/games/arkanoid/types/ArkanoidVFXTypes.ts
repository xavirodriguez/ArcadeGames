/**
 * Visual & UI Overhaul — Synthwave Arkanoid
 * Phase 0: VFX component types (no gameplay side-effects).
 *
 * BallTrail uses a pre-allocated ring buffer of TrailPoint to avoid
 * per-tick allocations. Prefer reusing shared CircularPositionBuffer
 * in a later juice phase if the visual needs grow more complex.
 */

/** Historical position of the ball for motion trail rendering. */
export interface TrailPoint {
  x: number;
  y: number;
  /** Simulation tick when this sample was recorded. */
  tick: number;
}

/**
 * Component attached to the Ball entity.
 * history is a fixed-capacity ring; write via index, never push/shift.
 */
export interface BallTrailComponent {
  type: "BallTrail";
  /** Pre-allocated ring of TrailPoint (length === maxLength). */
  history: TrailPoint[];
  /** Capacity of the ring (recommended 12). */
  maxLength: number;
  /** Next write index into history (0 .. maxLength-1). */
  writeIndex: number;
  /** How many valid samples are currently stored (0 .. maxLength). */
  count: number;
}

/** Flash on the paddle at the exact X of ball impact. */
export interface PaddleReflectionComponent {
  type: "PaddleReflection";
  /** -1 .. 1 relative to paddle centre. */
  hitOffsetX: number;
  /** 0 .. 1, decays over time (GameRules phase). */
  intensity: number;
}

/** Single ambient dust mote. */
export interface DustParticle {
  x: number;
  y: number;
  vx: number;
  /** Slow drift, typically -2 .. -8 px/s. */
  vy: number;
  radius: number;
  /** Phase offset for sinusoidal flicker. */
  phase: number;
}

/**
 * World resource (not an entity component) holding ambient VFX state.
 * Initialised once with world.gameplayRandom for determinism.
 */
export interface AmbientVFXResource {
  dust: DustParticle[];
  initialized: boolean;
}

/** Recommended trail length for Arkanoid ball. */
export const ARKANOID_TRAIL_LENGTH = 12;

/**
 * Factory that creates a zero-allocation BallTrail component
 * with a pre-filled ring of dummy points.
 */
export function createBallTrailComponent(
  maxLength: number = ARKANOID_TRAIL_LENGTH
): BallTrailComponent {
  const history: TrailPoint[] = new Array(maxLength);
  for (let i = 0; i < maxLength; i++) {
    history[i] = { x: 0, y: 0, tick: 0 };
  }
  return {
    type: "BallTrail",
    history,
    maxLength,
    writeIndex: 0,
    count: 0,
  };
}

/** Factory for a neutral (no flash) PaddleReflection component. */
export function createPaddleReflectionComponent(): PaddleReflectionComponent {
  return {
    type: "PaddleReflection",
    hitOffsetX: 0,
    intensity: 0,
  };
}
