import { Component, CoreComponentRegistry, CoreEvents } from "@tiny-aster/core";

export interface FlappyBirdEventRegistry extends CoreEvents, Record<string, unknown> {
  "flappy:near_miss": { points: number };
  "flappy:near_miss_particles": { x: number; y: number; count: number; minSpeed: number; maxSpeed: number };
  "pipe:passed": Record<string, unknown>;
}
import { ComboComponent } from "@tiny-aster/core";

export interface FlappyBirdComponentRegistry extends CoreComponentRegistry {
  FlappyInput: FlappyBirdInputComponent;
  Bird: BirdComponent;
  Pipe: PipeComponent;
  FlappyState: FlappyBirdState;
  Combo: ComboComponent;
  GlideEnergy: GlideEnergyComponent;
}

/**
 * Represents the current state of user inputs for Flappy Bird.
 */
export interface FlappyBirdInput {
  flap: boolean;
  glide: boolean;
  [key: string]: unknown;
}

/**
 * Stores the current input state for the bird in Flappy Bird.
 */
export interface FlappyBirdInputComponent extends Component, FlappyBirdInput {
  type: "FlappyInput";
  flapCooldownRemaining: number;
  pressDuration?: number;
  isPressed?: boolean;
}

/**
 * Component for the bird entity.
 */
export interface BirdComponent extends Component {
  type: "Bird";
  velocityY: number;
  isAlive: boolean;
  isGliding: boolean;
  nearMissTimer: number;
  coyoteTimer: number;
  nearMissParticleCount?: number;
  nearMissMinSpeed?: number;
  nearMissMaxSpeed?: number;
}

/**
 * Component to manage glide energy and overheat mechanics for the bird.
 */
export interface GlideEnergyComponent extends Component {
  type: "GlideEnergy";
  currentEnergy: number;
  maxEnergy: number;
  rechargeRate: number;
  drainRate: number;
  isOverheated: boolean;
  overheatCooldownTicks: number;
}

/**
 * Component for pipe entities.
 */
export interface PipeComponent extends Component {
  type: "Pipe";
  gapY: number;
  gapSize: number;
  scored: boolean;
  visualVariant?: "standard" | "damaged" | "rusted";

  // Dynamic Obstacle Fields
  movementType?: "static" | "oscillating" | "laser_gate";
  baseGapY?: number;
  oscillationSpeed?: number;      // rad/s
  oscillationAmplitude?: number;  // px
  oscillationPhase?: number;      // rad
  laserActive?: boolean;
  laserPulseFrequency?: number;   // Hz
  isNarrowGap?: boolean;
  narrowGapMultiplier?: number;
  pairId?: number;
  isTopPipe?: boolean;
}

/**
 * Component to track global game progress and state.
 */
export interface FlappyBirdState extends Component {
  type: "FlappyState";
  score: number;
  isGameOver: boolean;
  highScore: number;
  pipeSpawnTimer: number;
  gameOverLogged: boolean;

  pipesSpawnedCount?: number;
  currentSectorEvent?: "none" | "solar_flare" | "asteroid_storm" | "hyper_warp";
  sectorEventTicks?: number;
  sectorEventDuration?: number;
  pipeSpeedMultiplier?: number;
}

/**
 * Null Object for FlappyBirdState.
 */
export const INITIAL_FLAPPY_STATE: FlappyBirdState = Object.freeze({
  type: "FlappyState",
  score: 0,
  isGameOver: false,
  highScore: 0,
  pipeSpawnTimer: 0,
  gameOverLogged: false,
  pipesSpawnedCount: 0,
  currentSectorEvent: "none",
  sectorEventTicks: 0,
  sectorEventDuration: 0,
  pipeSpeedMultiplier: 1.0,
});

import { DEFAULT_FLAPPY_BIRD_CONFIG } from "./FlappyBirdConfigSchema";

/**
 * Global game configuration constants for Flappy Bird.
 */
export const FLAPPY_CONFIG = DEFAULT_FLAPPY_BIRD_CONFIG;
