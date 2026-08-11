import { World } from "../../ecs/World";
import { System } from "../../ecs/System";
import { ComponentRegistry } from "../../ecs/Component";
import { CoreComponentRegistry } from "../../ecs/CoreComponents";
import { Entity } from "../../ecs/Entity";

/**
 * System that applies asymmetrical gravity based on whether the entity is rising or falling.
 * @public
 */
export class PlatformerGravitySystem<TRegistry extends ComponentRegistry = CoreComponentRegistry> extends System<TRegistry> {
  public update(world: World<TRegistry>, deltaTime: number): void {
    const configType = "PlatformerGravityConfig" as Extract<keyof TRegistry, string>;
    const velocityType = "Velocity" as Extract<keyof TRegistry, string>;
    const groundStateType = "PlatformerGroundState" as Extract<keyof TRegistry, string>;

    const entities = world.query(configType, velocityType);

    for (const entity of entities) {
      const config = world.getComponent(entity, configType) as any;
      const vel = world.getComponent(entity, velocityType) as any;
      const groundState = world.hasComponent(entity, groundStateType)
        ? (world.getComponent(entity, groundStateType) as any)
        : null;

      if (!config || !vel) continue;

      // If grounded, do not apply gravity (or we can let it apply, but usually gravity pulls down and collision pushes up).
      // Standard platformers still apply gravity when grounded to keep the player attached to slopes, but we can bypass it if grounded is true.
      // However, to keep standard gravity/ground collision resolving properly, we apply gravity. Let's apply it.
      if (groundState && groundState.isGrounded && vel.vy >= 0) {
        // Just minor gravity or 0 to keep from sinking indefinitely (collision system usually sets vy = 0 anyway, but we can do vy = 0 too)
        // Let's just apply standard gravity so that collision system's push-out keeps them grounded.
      }

      let gravity = vel.vy < 0 ? config.riseGravity : config.fallGravity;

      if (config.apexThreshold !== undefined && config.apexGravityMultiplier !== undefined) {
        if (Math.abs(vel.vy) < config.apexThreshold) {
          gravity *= config.apexGravityMultiplier;
        }
      }

      world.mutateComponent(entity, velocityType, (v: any) => {
        v.vy += gravity * deltaTime;
      });
    }
  }
}
