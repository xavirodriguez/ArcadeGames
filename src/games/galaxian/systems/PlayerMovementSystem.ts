import { System, World } from "@tiny-aster/core";
import { GalaxianComponentRegistry, GalaxianInputComponent } from "../types/GalaxianTypes";
import { GalaxianConfig } from "../types/GalaxianConfigSchema";

export class PlayerMovementSystem extends System<GalaxianComponentRegistry> {
  public update(world: World<GalaxianComponentRegistry>, deltaTime: number): void {
    if (world.getResource("IsPaused") === true || deltaTime <= 0) return;

    const config = world.getResource<GalaxianConfig>("GameConfig");
    const worldWidth = config?.worldWidth ?? 480;
    const speed = config?.PLAYER_SPEED ?? 220;
    const playerWidth = config?.PLAYER_RENDER_WIDTH ?? 32;
    const minX = playerWidth / 2;
    const maxX = worldWidth - playerWidth / 2;

    const playerEntities = world.query("Player", "Transform", "Input");
    for (const entity of playerEntities) {
      const transform = world.getMutableComponent(entity, "Transform");
      const input = world.getComponent(entity, "Input") as GalaxianInputComponent | undefined;
      if (!transform || !input) continue;

      let dx = 0;
      if (input.moveLeft) dx -= 1;
      if (input.moveRight) dx += 1;

      if (dx !== 0) {
        transform.x += dx * speed * deltaTime;
        transform.x = Math.max(minX, Math.min(maxX, transform.x));
        transform.dirty = true;
      }
    }
  }
}
