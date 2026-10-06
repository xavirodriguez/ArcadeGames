import {
  CoreComponentRegistry,
  EventRegistry,
  Entity
} from "@tiny-aster/core";

/**
 * Singleton race state for the player.
 * Stored as a singleton component; mutated only by simulation systems.
 */
export interface RaceStateComponent {
  type: "RaceState";
  /** Player world-space Z position along the road (increases with speed). */
  playerZ: number;
  /** Player lateral position in road units (-1 left edge … +1 right edge, 0 center). */
  playerX: number;
  /** Current forward speed in world units per second. */
  speed: number;
  /** Accumulated lap / race time in seconds. */
  lapTime: number;
  /** Whether the race has ended. */
  isGameOver: boolean;
  /** Current position among traffic (1 = first). */
  position: number;
  /** Current segment index for convenience. */
  currentSegment: number;
}

/**
 * Component for rival racers / traffic.
 * Positions are in race coordinates (z, lateralX), not screen space.
 */
export interface RacerComponent {
  type: "Racer";
  /** World-space Z position along the road. */
  z: number;
  /** Lateral offset in road units (-1 … +1). */
  lateralX: number;
  /** Forward speed in world units per second. */
  speed: number;
  /** Visual color / style index. */
  colorIndex: number;
  /** Whether this racer is still active. */
  active: boolean;
}

/**
 * Marker for the single road render root entity.
 */
export interface RoadRootComponent {
  type: "RoadRoot";
}

/**
 * Road segment data (not an ECS component — stored as world resource).
 */
export interface RoadSegment {
  index: number;
  length: number;
  /** Horizontal curvature (positive = right, negative = left). */
  curve: number;
  /** Vertical hill height offset. */
  hill: number;
}

/**
 * Projected screen-space segment produced by pure projection math.
 */
export interface ProjectedSegment {
  x1: number;
  y1: number;
  w1: number;
  x2: number;
  y2: number;
  w2: number;
  curve: number;
  fog: number;
  clip: number;
  /** Original segment index for rumble coloring. */
  index: number;
  /** Segment p1.z for depth sorting / sprite projection. */
  p1z: number;
  p2z: number;
}

/**
 * Resource holding the immutable road geometry.
 */
export interface RoadData {
  segments: RoadSegment[];
  trackLength: number;
}

export interface OutrunComponentRegistry extends CoreComponentRegistry {
  RaceState: RaceStateComponent;
  Racer: RacerComponent;
  RoadRoot: RoadRootComponent;
}

export interface OutrunEventRegistry extends EventRegistry {
  "outrun:collision": { entity: Entity; other: Entity };
  "outrun:lap": { lapTime: number };
  "PlaySFX": { name: string };
}

export interface OutrunInput {
  accelerate: boolean;
  brake: boolean;
  left: boolean;
  right: boolean;
  [key: string]: unknown;
}
