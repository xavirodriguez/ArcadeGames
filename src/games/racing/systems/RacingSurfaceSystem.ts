import { System, World } from "@tiny-aster/core";
import type { RacingComponentRegistry, RacingEventRegistry } from "../types/RacingRegistry";
import type { RacingConfig } from "../types/RacingConfigSchema";
import type { TrackSpec } from "../types/TrackSpecSchema";

export class RacingSurfaceSystem extends System<RacingComponentRegistry, RacingEventRegistry> {
  constructor(private readonly config: RacingConfig) { super(); }

  public update(world: World<RacingComponentRegistry, RacingEventRegistry>): void {
    const trackSpec = world.getResource<TrackSpec>("ActiveTrackSpec");
    const cars = world.query("Car", "Transform", "Velocity");

    for (let i = 0; i < cars.length; i += 1) {
      const entity = cars[i];
      const transform = world.getComponent(entity, "Transform");
      const velocity = world.getMutableComponent(entity, "Velocity");
      if (!transform || !velocity) continue;

      let gripMult = 1.0;
      let speedMult = 1.0;

      if (trackSpec && trackSpec.zones) {
        for (let j = 0; j < trackSpec.zones.length; j++) {
          const zone = trackSpec.zones[j];
          const halfW = zone.width / 2;
          const halfH = zone.height / 2;
          if (
            transform.x >= zone.x - halfW &&
            transform.x <= zone.x + halfW &&
            transform.y >= zone.y - halfH &&
            transform.y <= zone.y + halfH
          ) {
            gripMult *= zone.gripModifier;
            speedMult *= zone.speedModifier;
          }
        }
      }

      // Apply off-track penalty if outside margins
      const margin = 30;
      const width = trackSpec?.width ?? this.config.WORLD_WIDTH;
      const height = trackSpec?.height ?? this.config.WORLD_HEIGHT;

      const offWorld = transform.x < margin || transform.y < margin || transform.x > width - margin || transform.y > height - margin;
      if (offWorld) {
        speedMult *= Math.max(0.7, 1 - this.config.TRACK_GRASS_GRIP * 0.01);
      }

      velocity.vx *= speedMult;
      velocity.vy *= speedMult;

      const carComp = world.getMutableComponent(entity, "Car");
      if (carComp) {
        carComp.grip = this.config.CAR_GRIP * gripMult;
      }
    }
  }

  public onRegister(_world: World<RacingComponentRegistry, RacingEventRegistry>): void {}
  public dispose(): void {}
}
