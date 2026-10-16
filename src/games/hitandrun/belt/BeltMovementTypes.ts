/**
 * Belt-scroll movement types for Hit&Run → fantasy belt-brawler conversion.
 * Free movement on X (progress) + Y (depth/lanes). No gravity.
 */

import type { Component } from "@tiny-aster/core";
import {
  DEFAULT_BELT_MOVEMENT_CONFIG,
  type BeltMovementConfig
} from "./BeltMovementConfig";

/**
 * Normalized input for belt movement (8-dir capable).
 * Held flags are set by the input bridge; *Pressed are one-frame edges
 * computed by BeltInputSystem.
 */
export interface BeltInputComponent extends Component {
  type: "BeltInput";
  moveX: number;
  moveY: number;
  attackHeld: boolean;
  attackPressed: boolean;
  fireHeld: boolean;
  firePressed: boolean;
  specialHeld: boolean;
  specialPressed: boolean;
  jumpHeld: boolean;
  jumpPressed: boolean;
  _prevHeldMask: number;
}

export function createBeltInputComponent(): BeltInputComponent {
  return {
    type: "BeltInput",
    moveX: 0,
    moveY: 0,
    attackHeld: false,
    attackPressed: false,
    fireHeld: false,
    firePressed: false,
    specialHeld: false,
    specialPressed: false,
    jumpHeld: false,
    jumpPressed: false,
    _prevHeldMask: 0
  };
}

export * from "./BeltMovementConfig";
export * from "./BeltElevationComponent";
export * from "./BeltDepth";

export interface BeltMovementComponent extends Component {
  type: "BeltMovement";
  facing: number;
  isHopping: boolean;
  hopElapsed: number;
  groundY: number;
  configId?: string;
}

export function createBeltMovementComponent(
  facing = 1
): BeltMovementComponent {
  return {
    type: "BeltMovement",
    facing,
    isHopping: false,
    hopElapsed: 0,
    groundY: 0
  };
}

export const BELT_MOVEMENT_CONFIG_RESOURCE = "BeltMovementConfig";

export function getBeltMovementConfig(world: {
  getResource: <T>(key: string) => T | undefined;
}): BeltMovementConfig {
  return (
    world.getResource<BeltMovementConfig>(BELT_MOVEMENT_CONFIG_RESOURCE) ??
    DEFAULT_BELT_MOVEMENT_CONFIG
  );
}

export interface BeltInputPartial {
  moveLeft?: boolean;
  moveRight?: boolean;
  moveUp?: boolean;
  moveDown?: boolean;
  left?: boolean;
  right?: boolean;
  up?: boolean;
  down?: boolean;
  jump?: boolean;
  attack?: boolean;
  fire?: boolean;
  special?: boolean;
  pulse?: boolean;
}
