import {
  CoreComponentRegistry,
  BlueprintRegistry,
  World
} from "@tiny-aster/core";
import { ArcadeEntityBuilder } from "../builders/ArcadeEntityBuilder";

/**
 * Registers platformer environment blueprints (`checkpoint_node`, `moving_platform`)
 * on the provided blueprint registry.
 *
 * @public
 */
export function registerPlatformerEnvironmentBlueprints(
  blueprints: BlueprintRegistry<CoreComponentRegistry, any, any>
): void {
  blueprints.register("checkpoint_node", {
    spawn: (world: World<CoreComponentRegistry>, entity: number, args: { x: number; y: number; id: string }) => {
      ArcadeEntityBuilder.fromEntity(world, entity)
        .withTransform({ x: args.x, y: args.y })
        .withRender({ shape: "node", size: 32, order: 1 });

      world.addComponent(entity, {
        type: "RespawnPoint",
        x: args.x,
        y: args.y - 10,
        checkpointId: args.id
      } as { type: string; [key: string]: unknown });
    }
  });

  blueprints.register("moving_platform", {
    spawn: (world: World<CoreComponentRegistry>, entity: number, args: { x: number; y: number; ampX: number; ampY: number; freq: number }) => {
      ArcadeEntityBuilder.fromEntity(world, entity)
        .withTransform({ x: args.x, y: args.y })
        .withVelocity()
        .withCollider2D({
          shape: { type: "aabb", halfWidth: 30, halfHeight: 10 },
          layer: 2
        })
        .withRender({ shape: "paddle", size: 60, order: 1 });

      world.addComponent(entity, {
        type: "MovingPlatform",
        pattern: "sine",
        startX: args.x,
        startY: args.y,
        amplitudeX: args.ampX,
        amplitudeY: args.ampY,
        frequency: args.freq,
        elapsed: 0
      } as { type: string; [key: string]: unknown });
    }
  });
}
