import { System, World } from "@tiny-aster/core";
import type { RacingComponentRegistry, RacingEventRegistry } from "../types/RacingRegistry";
import type { RacingConfig } from "../types/RacingConfigSchema";

export class RacingSurfaceSystem extends System<RacingComponentRegistry, RacingEventRegistry> {
  constructor(private readonly config: RacingConfig) { super(); }

  public update(world: World<RacingComponentRegistry, RacingEventRegistry>): void {
    const cars = world.query("Car", "Transform", "Velocity");
    for (let i = 0; i < cars.length; i += 1) {
      const entity = cars[i];
      const transform = world.getComponent(entity, "Transform");
      const velocity = world.getMutableComponent(entity, "Velocity");
      if (!transform || !velocity) continue;
      const margin = 30;
      const offWorld = transform.x < margin || transform.y < margin ||
        transform.x > this.config.WORLD_WIDTH - margin ||
        transform.y > this.config.WORLD_HEIGHT - margin;
      if (offWorld) {
        const factor = Math.max(0.7, 1 - this.config.TRACK_GRASS_GRIP * 0.01);
        velocity.vx *= factor;
        velocity.vy *= factor;
      }
    }
  }

  public onRegister(_world: World<RacingComponentRegistry, RacingEventRegistry>): void {}
  public dispose(): void {}
}
