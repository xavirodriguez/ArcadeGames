import { System, World, VelocityComponent } from "@tiny-aster/core";
import { GeometryWarsComponentRegistry } from "../types/GeometryWarsRegistry";
import { GeometryWarsConfig } from "../config/GeometryWarsConfig";

/**
 * GeometryWarsInputSystem maps movement inputs onto physical velocity.
 * @public
 */
export class GeometryWarsInputSystem extends System<GeometryWarsComponentRegistry> {
  public update(world: World<GeometryWarsComponentRegistry>, _deltaTime: number): void {
    const config = world.getResource<GeometryWarsConfig>("GameConfig");
    const speed = config?.PLAYER_SPEED ?? 220;

    const players = world.query("Player", "Velocity");
    for (const entity of players) {
      const player = world.getComponent(entity, "Player");
      if (!player) continue;

      world.mutateComponent(entity, "Velocity", (vel: VelocityComponent) => {
        // Calculate speed based on move direction vector
        let dx = player.moveX;
        let dy = player.moveY;

        const len = Math.sqrt(dx * dx + dy * dy);
        if (len > 1.0) {
          dx /= len;
          dy /= len;
        }

        vel.vx = dx * speed;
        vel.vy = dy * speed;
      });
    }
  }
}
