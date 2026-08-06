import { System, World } from "@tiny-aster/core";
import { GeometryWarsComponentRegistry } from "../types/GeometryWarsRegistry";

/**
 * GeometryWarsAISystem coordinates state changes and custom behaviors for enemies.
 * Specifically, it handles the "enemy_evader" behavior by switching its steering mode
 * to "flee" if it is too close to a player, and "seek" otherwise.
 * @public
 */
export class GeometryWarsAISystem extends System<GeometryWarsComponentRegistry> {
  public update(world: World<GeometryWarsComponentRegistry>, _deltaTime: number): void {
    const players = world.query("Player", "Transform");
    if (players.length === 0) return;

    // We assume the first player is our main target
    const playerEntity = players[0];
    const playerTransform = world.getComponent(playerEntity, "Transform");
    if (!playerTransform) return;

    const px = playerTransform.worldX ?? playerTransform.x;
    const py = playerTransform.worldY ?? playerTransform.y;

    const steerables = world.query("Steering", "Transform");
    for (const entity of steerables) {
      // Find out if this is an evader by checking its render shape or color/settings
      const render = world.getComponent(entity, "Render");
      if (!render || render.shape !== "gw_evader") continue;

      const transform = world.getComponent(entity, "Transform");
      if (!transform) continue;

      const ex = transform.worldX ?? transform.x;
      const ey = transform.worldY ?? transform.y;

      const dx = ex - px;
      const dy = ey - py;
      const dist = Math.hypot(dx, dy);

      world.mutateComponent(entity, "Steering", (s) => {
        if (dist < 180) {
          s.mode = "flee";
        } else {
          s.mode = "seek";
        }
      });
    }
  }
}
