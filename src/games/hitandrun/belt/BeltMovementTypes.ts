/**
 * Belt-scroll movement types for Hit&Run → fantasy belt-brawler conversion.
 * Free movement on X (progress) + Y (depth/lanes). No gravity.
 */

import type { Component } from "@tiny-aster/core";

/** Normalized input for belt movement (8-dir capable). */
export interface BeltInputComponent extends Component {
  type: "BeltInput";
  /** Horizontal axis: -1 | 0 | 1 (or analog -1..1). */
  moveX: number;
  /** Depth axis: -1 | 0 | 1 (toward camera / away). Maps to screen Y. */
  moveY: number;
  /** Attack / melee trigger this frame. */
  attackPressed: boolean;
  /** Ranged fire trigger this frame. */
  firePressed: boolean;
  /** Special / magic burst trigger this frame. */
  specialPressed: boolean;
  /** Optional jump (short hop for fantasy flair; no full platformer gravity). */
  jumpPressed: boolean;
}

export interface BeltMovementConfig {
  /** Max speed on X (progress axis). */
  maxSpeedX: number;
  /** Max speed on Y (depth axis). Often slightly lower for readable lanes. */
  maxSpeedY: number;
  /** Acceleration toward target velocity. */
  acceleration: number;
  /** Deceleration when no input. */
  deceleration: number;
  /** Optional short hop impulse (vy negative). 0 = disabled. */
  hopImpulse: number;
  /** Gravity only while airborne from hop (soft fantasy hop). */
  hopGravity: number;
  /** Max hop air time before forced landing (seconds). */
  hopMaxAirSeconds: number;
  /** Depth lane bounds (screen Y). */
  depthMin: number;
  depthMax: number;
}

export const DEFAULT_BELT_MOVEMENT_CONFIG: BeltMovementConfig = {
  maxSpeedX: 160,
  maxSpeedY: 110,
  acceleration: 900,
  deceleration: 1100,
  hopImpulse: -220,
  hopGravity: 980,
  hopMaxAirSeconds: 0.45,
  depthMin: 280,
  depthMax: 520
};

/**
 * Per-entity belt movement state (player or AI that uses same locomotion).
 */
export interface BeltMovementComponent extends Component {
  type: "BeltMovement";
  /** Facing for attacks: 1 = right, -1 = left. */
  facing: number;
  /** True while in short hop arc. */
  isHopping: boolean;
  /** Elapsed time in current hop. */
  hopElapsed: number;
  /** Ground (depth plane) Y when hop started — used to return. */
  groundY: number;
  /** Optional config override id. */
  configId?: string;
}

export const BELT_MOVEMENT_CONFIG_RESOURCE = "BeltMovementConfig";
