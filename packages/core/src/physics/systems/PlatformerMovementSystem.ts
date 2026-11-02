import { World } from "../../ecs/World";
import { System } from "../../ecs/System";
import { ComponentRegistry } from "../../ecs/Component";
import { CoreComponentRegistry, PlatformerInputComponent, PlatformerMovementConfigComponent, VelocityComponent, PlatformerGroundStateComponent, LocomotionProfileComponent } from "../../ecs/CoreComponents";
import { Entity } from "../../ecs/Entity";

/**
 * System that handles platformer horizontal movement with acceleration and deceleration.
 *
 * @remarks
 * Dynamically switches between grounded acceleration/deceleration and airborne
 * airAcceleration/airDeceleration values based on the entity's PlatformerGroundState.
 * @public
 */
export class PlatformerMovementSystem<TRegistry extends ComponentRegistry = CoreComponentRegistry> extends System<TRegistry> {
  /**
   * Processes horizontal platformer movement acceleration and deceleration for active entities.
   *
   * @param world - Simulation world instance.
   * @param deltaTime - Elapsed frame duration in seconds.
   *
   * @sideEffect Mutates `Velocity` components on active platformer entities.
   */
  public update(world: World<TRegistry>, deltaTime: number): void {
    if (world.getResource("IsPaused") === true) return;
    const inputType = "PlatformerInput" as Extract<keyof TRegistry, string>;
    const configType = "PlatformerMovementConfig" as Extract<keyof TRegistry, string>;
    const velocityType = "Velocity" as Extract<keyof TRegistry, string>;
    const groundStateType = "PlatformerGroundState" as Extract<keyof TRegistry, string>;

    const entities = world.query(inputType, velocityType);
    const len = entities.length;

    // Safe for determinism/rollback. Sequential indexed loop eliminates per-tick iterator allocations.
    for (let i = 0; i < len; i++) {
      const entity = entities[i];
      const input = world.getComponent(entity, inputType) as unknown as PlatformerInputComponent | undefined;
      const config = world.getComponent(entity, configType) as unknown as PlatformerMovementConfigComponent | undefined;
      const vel = world.getComponent(entity, velocityType) as unknown as VelocityComponent | undefined;
      const groundState = world.hasComponent(entity, groundStateType)
        ? (world.getComponent(entity, groundStateType) as unknown as PlatformerGroundStateComponent | undefined)
        : null;

      if (!input || !vel) continue;

      const isGrounded = groundState ? groundState.isGrounded : false;
      const profile = world.getComponent(entity, "LocomotionProfile" as Extract<keyof TRegistry, string>) as LocomotionProfileComponent | undefined;
      if (profile) {
        const movement = isGrounded ? profile.ground : profile.air;
        const moveDir = Math.max(-1, Math.min(1, input.moveDir));
        const targetSpeed = moveDir * movement.maxSpeed;
        let target = targetSpeed;
        let acceleration: number;

        if (input.brake === true) {
          target = 0;
          acceleration = movement.brakingAcceleration;
        } else if (moveDir === 0) {
          target = 0;
          acceleration = movement.deceleration;
        } else if (vel.vx !== 0 && Math.sign(vel.vx) !== Math.sign(moveDir)) {
          acceleration = movement.turnAcceleration;
        } else {
          acceleration = movement.acceleration;
        }

        // Air steering scales acceleration authority only; it never scales existing velocity.
        if (!isGrounded) {
          acceleration *= profile.air.steeringMultiplier;
        }

        const controlledVx = this.moveTowards(
          vel.vx,
          target,
          Math.max(0, acceleration) * Math.max(0, deltaTime)
        );
        // Drag is a separate physical damping rate (s^-1), not an air-control multiplier.
        const drag = Math.max(0, isGrounded ? profile.momentum.groundDrag : profile.momentum.airDrag);
        const dragFactor = Math.max(0, 1 - drag * Math.max(0, deltaTime));
        const newVx = controlledVx * dragFactor;

        if (vel.vx !== newVx) {
          const mutableVel = world.getMutableComponent(entity, velocityType) as VelocityComponent | undefined;
          if (mutableVel) mutableVel.vx = newVx;
        }
        continue;
      }

      if (!config) continue;

      const iceMultiplier = groundState && groundState.iceMultiplier !== undefined ? groundState.iceMultiplier : 1;
      const accel = isGrounded ? config.acceleration : config.airAcceleration;
      const decel = isGrounded ? config.deceleration : config.airDeceleration;
      const effectiveAccel = accel * iceMultiplier;
      const effectiveDecel = decel * iceMultiplier;

      const targetSpeed = input.moveDir * config.maxSpeed;

      const newVx = input.moveDir !== 0
        ? this.moveTowards(vel.vx, targetSpeed, effectiveAccel * deltaTime)
        : this.moveTowards(vel.vx, 0, effectiveDecel * deltaTime);

      if (vel.vx !== newVx) {
        // Safe for determinism/rollback. Avoids per-tick closure allocations and stateVersion bumps when horizontal velocity is unchanged.
        const mutableVel = world.getMutableComponent(entity, velocityType) as unknown as VelocityComponent | undefined;
        if (mutableVel) {
          mutableVel.vx = newVx;
        }
      }
    }
  }

  private moveTowards(current: number, target: number, maxDelta: number): number {
    if (Math.abs(target - current) <= maxDelta) {
      return target;
    }
    return current + Math.sign(target - current) * maxDelta;
  }
}
