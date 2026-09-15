import { World, EntityBuilder } from "@tiny-aster/core";

export interface PlatformerPlayerConfig {
  x: number;
  y: number;
  size?: number;
  color?: string;
  speed?: number;
  jumpVelocity?: number;
  gravity?: number;
}

/**
 * Shared blueprint factory for platformer player entity setup.
 * @public
 */
export function createPlatformerPlayerBlueprint(config: PlatformerPlayerConfig) {
  return {
    spawn(world: World<any>, entity: number) {
      EntityBuilder.createDeferred(world)
        .withTransform({ x: config.x, y: config.y })
        .withRender({ shape: "player", size: config.size ?? 20, color: config.color ?? "#00f0ff" });
    }
  };
}
