import { World } from "../../ecs/World";
import { System } from "../../ecs/System";
import { ComponentRegistry } from "../../ecs/Component";
import { CoreComponentRegistry, PlatformerInputComponent, PlatformerMovementConfigComponent, VelocityComponent, PlatformerGroundStateComponent, LocomotionProfileComponent, PhysicsContactStateComponent, PhysicsMaterial, PlatformerGravityConfigComponent } from "../../ecs/CoreComponents";
import { Entity } from "../../ecs/Entity";
import { moveTowards } from "../../math/MathUtils";

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
      const contactState = world.getComponent(entity, "PhysicsContactState" as Extract<keyof TRegistry, string>) as PhysicsContactStateComponent | undefined;
      const groundContact = isGrounded ? contactState?.groundContact : undefined;
      const material = groundContact?.material;
      const surfaceVelocityX = groundContact?.surfaceVelocity.x ?? 0;
      const relativeVx = vel.vx - surfaceVelocityX;
      const gravityConfig = world.getComponent(entity, "PlatformerGravityConfig" as Extract<keyof TRegistry, string>) as PlatformerGravityConfigComponent | undefined;
      const gravityMagnitude = gravityConfig?.fallGravity ?? 980;
      const profile = world.getComponent(entity, "LocomotionProfile" as Extract<keyof TRegistry, string>) as LocomotionProfileComponent | undefined;
      if (profile) {
        const posture = world.getComponent(entity, "PlatformerPosture" as Extract<keyof TRegistry, string>) as { current?: string } | undefined;
        if (isGrounded && (posture?.current === "sliding" || posture?.current === "blocked") && profile.slide) {
          const slide = profile.slide;
          const moveDir = Math.max(-1, Math.min(1, input.moveDir));
          const steering = Math.max(0, slide.accelerationMultiplier) * Math.max(0, slide.steeringMultiplier);
          const traction = material ? this.clamp01(material.traction) : 1;
          let slideVx = relativeVx;
          if (moveDir !== 0) {
            slideVx = moveTowards(
              relativeVx,
              moveDir * profile.ground.maxSpeed,
              profile.ground.acceleration * steering * traction * Math.max(0, deltaTime)
            );
          }
          const slideFriction = Math.max(0, material?.dynamicFriction ?? 0.6)
            * Math.max(0, slide.frictionMultiplier) * gravityMagnitude * Math.max(0, deltaTime);
          slideVx = moveTowards(slideVx, 0, slideFriction);
          const slideVelocity = slideVx + surfaceVelocityX;
          if (vel.vx !== slideVelocity) {
            const mutableVelocity = world.getMutableComponent(entity, velocityType) as VelocityComponent | undefined;
            if (mutableVelocity) mutableVelocity.vx = slideVelocity;
          }
          continue;
        }
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
        } else if (relativeVx !== 0 && Math.sign(relativeVx) !== Math.sign(moveDir)) {
          acceleration = movement.turnAcceleration;
        } else {
          acceleration = movement.acceleration;
        }

        // Air steering scales acceleration authority only; it never scales existing velocity.
        if (!isGrounded) {
          acceleration *= profile.air.steeringMultiplier;
        } else if (material && (moveDir !== 0 || input.brake === true)) {
          acceleration *= this.clamp01(material.traction);
        }

        let controlledVx = moveTowards(
          relativeVx,
          target,
          Math.max(0, acceleration) * Math.max(0, deltaTime)
        );
        if (isGrounded && material) {
          controlledVx = this.applySurfaceFriction(controlledVx, material, gravityMagnitude, deltaTime, moveDir === 0 && input.brake !== true);
        }
        // Drag is a separate physical damping rate (s^-1), not an air-control multiplier.
        const drag = Math.max(0, isGrounded ? profile.momentum.groundDrag : profile.momentum.airDrag);
        const dragFactor = Math.max(0, 1 - drag * Math.max(0, deltaTime));
        const newVx = controlledVx * dragFactor + surfaceVelocityX;

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
      const materialAcceleration = material && isGrounded && input.moveDir !== 0
        ? effectiveAccel * this.clamp01(material.traction)
        : effectiveAccel;
      let controlledVx = input.moveDir !== 0
        ? moveTowards(relativeVx, targetSpeed, materialAcceleration * deltaTime)
        : moveTowards(relativeVx, 0, effectiveDecel * deltaTime);
      if (material && isGrounded) {
        controlledVx = this.applySurfaceFriction(controlledVx, material, gravityMagnitude, deltaTime, input.moveDir === 0);
      }
      const newVx = controlledVx + surfaceVelocityX;

      if (vel.vx !== newVx) {
        // Safe for determinism/rollback. Avoids per-tick closure allocations and stateVersion bumps when horizontal velocity is unchanged.
        const mutableVel = world.getMutableComponent(entity, velocityType) as unknown as VelocityComponent | undefined;
        if (mutableVel) {
          mutableVel.vx = newVx;
        }
      }
    }
  }

  private clamp01(value: number): number {
    return Math.min(1, Math.max(0, value));
  }

  private applySurfaceFriction(
    relativeVelocity: number,
    material: PhysicsMaterial,
    gravityMagnitude: number,
    deltaTime: number,
    noDriveInput: boolean
  ): number {
    const dt = Math.max(0, deltaTime);
    const speed = Math.abs(relativeVelocity);
    if (speed === 0 || dt === 0) return relativeVelocity;

    const normalAcceleration = Math.max(0, gravityMagnitude);
    const staticThreshold = this.clamp01(material.staticFriction) * normalAcceleration * dt;
    if (noDriveInput && speed <= staticThreshold) return 0;

    const frictionDelta = this.clamp01(material.dynamicFriction) * normalAcceleration * dt;
    return moveTowards(relativeVelocity, 0, frictionDelta);
  }
}
