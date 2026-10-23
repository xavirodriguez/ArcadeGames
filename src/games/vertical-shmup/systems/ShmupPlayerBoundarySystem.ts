import { System, World } from "@tiny-aster/core";
import { ShmupComponentRegistry, ShmupEventRegistry } from "../types/ShmupTypes";
import { ShmupConfig } from "../types/ShmupConfigSchema";

/**
 * Applies exact player bounds after velocity integration.
 *
 * The shared BoundarySystem supports wrap/destroy and edge bounce, but its bounce
 * mode does not clamp an entity to the player's inset playfield rectangle when
 * bouncing is disabled. This system enforces that game-specific contract.
 */
export class ShmupPlayerBoundarySystem extends System<ShmupComponentRegistry, ShmupEventRegistry> {
  update(world: World<ShmupComponentRegistry, ShmupEventRegistry>, _deltaTime: number): void {
    if (world.getResource("IsPaused") === true) return;
    const config = world.getResource<ShmupConfig>("GameConfig");
    if (!config) return;

    const minX = config.PLAYER_SIZE;
    const maxX = config.WORLD_WIDTH - config.PLAYER_SIZE;
    const minY = config.PLAYER_SIZE;
    const maxY = config.WORLD_HEIGHT - config.PLAYER_SIZE;

    for (const entity of world.query("ShmupPlayer", "Transform", "Velocity")) {
      const transform = world.getMutableComponent(entity, "Transform");
      const velocity = world.getMutableComponent(entity, "Velocity");
      if (!transform || !velocity) continue;

      if (transform.x < minX) {
        transform.x = minX;
        if (velocity.vx < 0) velocity.vx = 0;
        transform.dirty = true;
      } else if (transform.x > maxX) {
        transform.x = maxX;
        if (velocity.vx > 0) velocity.vx = 0;
        transform.dirty = true;
      }

      if (transform.y < minY) {
        transform.y = minY;
        if (velocity.vy < 0) velocity.vy = 0;
        transform.dirty = true;
      } else if (transform.y > maxY) {
        transform.y = maxY;
        if (velocity.vy > 0) velocity.vy = 0;
        transform.dirty = true;
      }
    }
  }
}
