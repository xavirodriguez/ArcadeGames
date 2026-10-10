import {
  System,
  World,
  CoreComponentRegistry
} from "@tiny-aster/core";
import {
  DEFAULT_BELT_MOVEMENT_CONFIG,
  type BeltMovementConfig,
  BELT_MOVEMENT_CONFIG_RESOURCE,
  depthT
} from "./BeltMovementTypes";

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * BeltDepthScaleSystem — applies subtle perspective depth scaling lerp(0.92, 1.0, depthT(y))
 * to VisualOffset.scaleX and VisualOffset.scaleY.
 * Runs in SystemPhase.Simulation before rendering without altering physical colliders or hitboxes.
 */
export class BeltDepthScaleSystem extends System<CoreComponentRegistry> {
  public update(world: World<CoreComponentRegistry>, _dt: number): void {
    if (world.getResource("IsPaused") === true) return;

    const config =
      world.getResource<BeltMovementConfig>(BELT_MOVEMENT_CONFIG_RESOURCE) ??
      DEFAULT_BELT_MOVEMENT_CONFIG;

    const entities = world.query("Transform", "Render");
    const len = entities.length;

    for (let i = 0; i < len; i++) {
      const entity = entities[i];
      const transform = world.getComponent(entity, "Transform");
      if (!transform) continue;

      const y = transform.worldX !== undefined && transform.worldY !== undefined
        ? transform.worldY
        : transform.y;

      const dtVal = depthT(y, config.depthMin, config.depthMax);
      const scaleVal = lerp(0.92, 1.0, dtVal);

      if (!world.hasComponent(entity, "VisualOffset")) {
        world.getCommandBuffer().addComponent(entity, {
          type: "VisualOffset",
          offsetX: 0,
          offsetY: 0,
          scaleX: scaleVal,
          scaleY: scaleVal
        } as any);
      } else {
        const offset = world.getMutableComponent(entity, "VisualOffset") as
          | { scaleX?: number; scaleY?: number }
          | undefined;
        if (offset) {
          offset.scaleX = scaleVal;
          offset.scaleY = scaleVal;
        }
      }
    }
  }
}
