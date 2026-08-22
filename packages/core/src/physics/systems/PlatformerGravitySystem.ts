import { World } from "../../ecs/World";
import { System } from "../../ecs/System";
import { ComponentRegistry } from "../../ecs/Component";
import { CoreComponentRegistry } from "../../ecs/CoreComponents";
import { Entity } from "../../ecs/Entity";

/**
 * Platformer gravity system applying asymmetrical jump gravity dynamics.
 *
 * @remarks
 * Applies distinct gravity factors depending on whether the entity is rising (negative Y velocity)
 * or falling (positive Y velocity), enabling satisfying platformer jump feel (e.g. snappy falling,
 * low-gravity jump apex, floaty jump arc).
 *
 * @public
 */
export class PlatformerGravitySystem<TRegistry extends ComponentRegistry = CoreComponentRegistry> extends System<TRegistry> {
  /**
   * Applies asymmetrical jump gravity to entities possessing `PlatformerGravityConfig` and `Velocity`.
   *
   * @param world - Simulation world instance.
   * @param deltaTime - Elapsed frame duration in seconds.
   *
   * @sideEffect Mutates `Velocity` components on active entities.
   */
  public update(world: World<TRegistry>, deltaTime: number): void {
    const configType = "PlatformerGravityConfig" as Extract<keyof TRegistry, string>;
    const velocityType = "Velocity" as Extract<keyof TRegistry, string>;
    const groundStateType = "PlatformerGroundState" as Extract<keyof TRegistry, string>;

    const entities = world.query(configType, velocityType);
    const len = entities.length;

    // Safe for determinism/rollback. Sequential indexed loop eliminates per-tick iterator allocations.
    for (let i = 0; i < len; i++) {
      const entity = entities[i];
      const config = world.getComponent(entity, configType) as any;
      const vel = world.getComponent(entity, velocityType) as any;

      if (!config || !vel) continue;

      let gravity = vel.vy < 0 ? config.riseGravity : config.fallGravity;

      if (config.apexThreshold !== undefined && config.apexGravityMultiplier !== undefined) {
        if (Math.abs(vel.vy) < config.apexThreshold) {
          gravity *= config.apexGravityMultiplier;
        }
      }

      // Safe for determinism/rollback. Replacing mutateComponent with direct getMutableComponent eliminates callback closure allocations per frame.
      const mutableVel = world.getMutableComponent(entity, velocityType) as any;
      if (mutableVel) {
        mutableVel.vy += gravity * deltaTime;
      }
    }
  }
}
