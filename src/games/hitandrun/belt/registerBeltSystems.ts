/**
 * Registers belt-scroll movement + camera + elevation + depth scale + input edge systems and default resources.
 */

import {
  SystemPhase,
  World,
  CoreComponentRegistry
} from "@tiny-aster/core";
import { BeltMovementSystem } from "./BeltMovementSystem";
import { BeltElevationSystem } from "./BeltElevationSystem";
import { BeltDepthScaleSystem } from "./BeltDepthScaleSystem";
import { BeltInputSystem } from "./BeltInputSystem";
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
import { ensurePhysicsIntegration } from "./registerBeltPlayerBlueprint";

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

  ensurePhysicsIntegration(world);

  world.addSystem(new BeltInputSystem(), {
    phase: SystemPhase.Input,
    priority: 5
  });

  world.addSystem(new BeltMovementSystem(), {
    phase: SystemPhase.Simulation,
    priority: 10
  });

  world.addSystem(new BeltElevationSystem(), {
    phase: SystemPhase.Simulation,
    priority: 15
  });

  world.addSystem(new BeltDepthScaleSystem(), {
    phase: SystemPhase.Simulation,
    priority: 85
  });

  world.addSystem(new BeltCameraSystem(), {
    phase: SystemPhase.Simulation,
    priority: 80
  });
}

export * from "./BeltMovementTypes";
export * from "./BeltMovementSystem";
export * from "./BeltElevationSystem";
export * from "./BeltDepthScaleSystem";
export * from "./BeltCameraTypes";
export * from "./BeltCameraSystem";
export * from "./BeltInputSystem";
export * from "./mutateBeltInputState";
export * from "./registerBeltPlayerBlueprint";
