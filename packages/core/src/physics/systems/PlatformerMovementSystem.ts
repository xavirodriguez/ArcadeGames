import { World } from "../../ecs/World";
import { System } from "../../ecs/System";
import { ComponentRegistry } from "../../ecs/Component";
import { CoreComponentRegistry } from "../../ecs/CoreComponents";
import { Entity } from "../../ecs/Entity";

/**
 * System that handles platformer horizontal movement with acceleration and deceleration.
 * @public
 */
export class PlatformerMovementSystem<TRegistry extends ComponentRegistry = CoreComponentRegistry> extends System<TRegistry> {
  public update(world: World<TRegistry>, deltaTime: number): void {
    const inputType = "PlatformerInput" as Extract<keyof TRegistry, string>;
    const configType = "PlatformerMovementConfig" as Extract<keyof TRegistry, string>;
    const velocityType = "Velocity" as Extract<keyof TRegistry, string>;
    const groundStateType = "PlatformerGroundState" as Extract<keyof TRegistry, string>;

    const entities = world.query(inputType, configType, velocityType);

    for (const entity of entities) {
      const input = world.getComponent(entity, inputType) as any;
      const config = world.getComponent(entity, configType) as any;
      const vel = world.getComponent(entity, velocityType) as any;
      const groundState = world.hasComponent(entity, groundStateType)
        ? (world.getComponent(entity, groundStateType) as any)
        : null;

      if (!input || !config || !vel) continue;

      const isGrounded = groundState ? groundState.isGrounded : false;
      const iceMultiplier = groundState && groundState.iceMultiplier !== undefined ? groundState.iceMultiplier : 1;

      const accel = isGrounded ? config.acceleration : config.airAcceleration;
      const decel = isGrounded ? config.deceleration : config.airDeceleration;

      const effectiveAccel = accel * iceMultiplier;
      const effectiveDecel = decel * iceMultiplier;

      const targetSpeed = input.moveDir * config.maxSpeed;

      world.mutateComponent(entity, velocityType, (v: any) => {
        if (input.moveDir !== 0) {
          v.vx = this.moveTowards(v.vx, targetSpeed, effectiveAccel * deltaTime);
        } else {
          v.vx = this.moveTowards(v.vx, 0, effectiveDecel * deltaTime);
        }
      });
    }
  }

  private moveTowards(current: number, target: number, maxDelta: number): number {
    if (Math.abs(target - current) <= maxDelta) {
      return target;
    }
    return current + Math.sign(target - current) * maxDelta;
  }
}
