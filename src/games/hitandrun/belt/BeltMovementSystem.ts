/**
 * BeltMovementSystem — free X + depth movement for belt-scroll beat'em-up.
 * Replaces PlatformerGravity + PlatformerMovement for the player.
 * Triggers hop impulse on BeltElevationComponent without modifying Transform.y.
 */

import {
  System,
  World,
  CoreComponentRegistry,
  Entity
} from "@tiny-aster/core";
import {
  BELT_MOVEMENT_CONFIG_RESOURCE,
  DEFAULT_BELT_MOVEMENT_CONFIG,
  type BeltInputComponent,
  type BeltMovementComponent,
  type BeltMovementConfig
} from "./BeltMovementTypes";
import {
  createBeltElevationComponent,
  type BeltElevationComponent
} from "./BeltElevationComponent";

function moveTowards(current: number, target: number, maxDelta: number): number {
  if (Math.abs(target - current) <= maxDelta) return target;
  return current + Math.sign(target - current) * maxDelta;
}

export class BeltMovementSystem extends System<CoreComponentRegistry> {
  public update(world: World<CoreComponentRegistry>, deltaTime: number): void {
    if (world.getResource("IsPaused") === true) return;

    const config =
      world.getResource<BeltMovementConfig>(BELT_MOVEMENT_CONFIG_RESOURCE) ??
      DEFAULT_BELT_MOVEMENT_CONFIG;

    const entities = world.query("BeltMovement", "BeltInput", "Velocity", "Transform");
    const len = entities.length;

    for (let i = 0; i < len; i++) {
      const entity = entities[i];
      this.tickEntity(world, entity, config, deltaTime);
    }
  }

  private tickEntity(
    world: World<CoreComponentRegistry>,
    entity: Entity,
    config: BeltMovementConfig,
    dt: number
  ): void {
    const belt = world.getMutableComponent(entity, "BeltMovement") as
      | BeltMovementComponent
      | undefined;
    const input = world.getComponent(entity, "BeltInput") as
      | BeltInputComponent
      | undefined;
    const vel = world.getMutableComponent(entity, "Velocity") as
      | { vx: number; vy: number; angularVelocity: number }
      | undefined;
    const transform = world.getMutableComponent(entity, "Transform") as
      | {
          x: number;
          y: number;
          scaleX?: number;
          worldX?: number;
          worldY?: number;
        }
      | undefined;

    if (!belt || !input || !vel || !transform) return;

    const targetVx = input.moveX * config.maxSpeedX;
    const targetVyDepth = input.moveY * config.maxSpeedY;

    const accel = input.moveX !== 0 || input.moveY !== 0
      ? config.acceleration
      : config.deceleration;

    vel.vx = moveTowards(vel.vx, targetVx, accel * dt);

    if (input.moveX !== 0) {
      belt.facing = input.moveX > 0 ? 1 : -1;
    } else if (Math.abs(vel.vx) > 8) {
      belt.facing = vel.vx > 0 ? 1 : -1;
    }
    if (transform.scaleX !== undefined) {
      transform.scaleX = belt.facing >= 0 ? 1 : -1;
    }

    // Depth movement on ground plane (Y axis)
    vel.vy = moveTowards(vel.vy, targetVyDepth, accel * dt);

    if (transform.y < config.depthMin) {
      transform.y = config.depthMin;
      if (vel.vy < 0) vel.vy = 0;
    } else if (transform.y > config.depthMax) {
      transform.y = config.depthMax;
      if (vel.vy > 0) vel.vy = 0;
    }

    // Elevation vertical movement trigger (Z axis)
    let elevation = world.getMutableComponent(entity, "BeltElevation") as
      | BeltElevationComponent
      | undefined;

    if (!elevation) {
      elevation = createBeltElevationComponent();
      world.addComponent(entity, elevation);
    }

    const canHop = !belt.isHopping && (elevation.grounded || elevation.z <= 0);
    if (canHop && input.jumpPressed && config.hopImpulse !== 0) {
      belt.isHopping = true;
      belt.hopElapsed = 0;
      elevation.z = Math.max(0, elevation.z);
      elevation.vz = Math.abs(config.hopImpulse);
      elevation.grounded = false;
    }

    if (belt.isHopping) {
      belt.hopElapsed += dt;
      if (belt.hopElapsed >= config.hopMaxAirSeconds) {
        belt.isHopping = false;
      }
    }
  }
}
