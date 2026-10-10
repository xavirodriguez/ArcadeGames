import {
  System,
  World,
  CoreComponentRegistry
} from "@tiny-aster/core";
import {
  BELT_MOVEMENT_CONFIG_RESOURCE,
  DEFAULT_BELT_MOVEMENT_CONFIG,
  type BeltMovementConfig,
  type BeltMovementComponent
} from "./BeltMovementTypes";
import type { BeltElevationComponent } from "./BeltElevationComponent";

export class BeltElevationSystem extends System<CoreComponentRegistry> {
  public update(world: World<CoreComponentRegistry>, deltaTime: number): void {
    if (world.getResource("IsPaused") === true) return;

    const config =
      world.getResource<BeltMovementConfig>(BELT_MOVEMENT_CONFIG_RESOURCE) ??
      DEFAULT_BELT_MOVEMENT_CONFIG;

    const entities = world.query("BeltElevation");
    const len = entities.length;

    for (let i = 0; i < len; i++) {
      const entity = entities[i];
      const elevation = world.getMutableComponent(entity, "BeltElevation") as
        | BeltElevationComponent
        | undefined;
      if (!elevation) continue;

      // 1. Decay landTimer
      if (elevation.landTimer !== undefined && elevation.landTimer > 0) {
        elevation.landTimer = Math.max(0, elevation.landTimer - deltaTime);
      }

      // 2. Vertical air physics integration
      const wasAirborne = !elevation.grounded || elevation.z > 0;

      if (wasAirborne || elevation.vz !== 0) {
        elevation.vz -= config.hopGravity * deltaTime;
        elevation.z += elevation.vz * deltaTime;

        if (elevation.z <= 0) {
          elevation.z = 0;
          elevation.vz = 0;
          elevation.grounded = true;
          elevation.juggleCount = 0;

          if (wasAirborne) {
            elevation.landTimer = 0.15; // 150ms landing squash window
          }

          if (world.hasComponent(entity, "BeltMovement")) {
            const belt = world.getMutableComponent(entity, "BeltMovement") as
              | BeltMovementComponent
              | undefined;
            if (belt) {
              belt.isHopping = false;
              belt.hopElapsed = 0;
            }
          }
        } else {
          elevation.grounded = false;
        }
      }
    }
  }
}
