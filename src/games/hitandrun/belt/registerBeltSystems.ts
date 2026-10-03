/**
 * Registers belt-scroll movement + camera systems and default resources.
 */

import {
  SystemPhase,
  World,
  CoreComponentRegistry
} from "@tiny-aster/core";
import { BeltMovementSystem } from "./BeltMovementSystem";
import {
  BELT_MOVEMENT_CONFIG_RESOURCE,
  DEFAULT_BELT_MOVEMENT_CONFIG,
  type BeltMovementConfig
} from "./BeltMovementTypes";
import { BeltCameraSystem } from "./BeltCameraSystem";
import {
  BELT_CAMERA_CONFIG_RESOURCE,
  BELT_CAMERA_STATE_RESOURCE,
  DEFAULT_BELT_CAMERA_CONFIG,
  type BeltCameraConfig,
  type BeltCameraState
} from "./BeltCameraTypes";

export function registerBeltSystems(
  world: World<CoreComponentRegistry>,
  options: {
    movement?: Partial<BeltMovementConfig>;
    camera?: Partial<BeltCameraConfig>;
  } = {}
): void {
  const movementConfig: BeltMovementConfig = {
    ...DEFAULT_BELT_MOVEMENT_CONFIG,
    ...options.movement
  };
  world.setResource(BELT_MOVEMENT_CONFIG_RESOURCE, movementConfig);

  const cameraConfig: BeltCameraConfig = {
    ...DEFAULT_BELT_CAMERA_CONFIG,
    ...options.camera,
    sections: options.camera?.sections ?? DEFAULT_BELT_CAMERA_CONFIG.sections
  };
  world.setResource(BELT_CAMERA_CONFIG_RESOURCE, cameraConfig);

  const cameraState: BeltCameraState = {
    cameraX: cameraConfig.minCameraX,
    currentSectionIndex: 0,
    sectionCleared: false,
    gateLocked: true
  };
  world.setResource(BELT_CAMERA_STATE_RESOURCE, cameraState);
  world.setResource("CameraX", cameraState.cameraX);

  world.addSystem(new BeltMovementSystem(), {
    phase: SystemPhase.Simulation,
    priority: 10
  });
  world.addSystem(new BeltCameraSystem(), {
    phase: SystemPhase.Simulation,
    priority: 80
  });
}

export * from "./BeltMovementTypes";
export * from "./BeltMovementSystem";
export * from "./BeltCameraTypes";
export * from "./BeltCameraSystem";
