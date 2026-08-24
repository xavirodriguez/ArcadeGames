import { System, World } from "@tiny-aster/core";
import { NebulaDashComponentRegistry, NebulaDashEventRegistry } from "../types/NebulaDashRegistry";

export class VerticalScrollerSystem extends System<NebulaDashComponentRegistry, NebulaDashEventRegistry> {
  private margin: number;

  constructor(options: { margin?: number } = {}) {
    super();
    this.margin = options.margin ?? 300;
  }

  public override update(world: World<NebulaDashComponentRegistry, NebulaDashEventRegistry>, dt: number): void {
    if (world.getResource("IsPaused") === true) return;

    const players = world.query("Player", "Transform");
    if (players.length === 0) return;

    const playerTransform = world.getComponent(players[0], "Transform")!;

    // 1. Update max player altitude reached
    const currentAltitude = Math.max(0, Math.floor(500 - playerTransform.y));
    world.mutateSingleton("NebulaDashState", (state) => {
      if (currentAltitude > state.altitude) {
        state.altitude = currentAltitude;
      }
    });

    // 2. Determine camera Y cutoff
    const cameras = world.query("Camera2D");
    let cutoffY = playerTransform.y + 600 + this.margin;

    if (cameras.length > 0) {
      const cam = world.getComponent(cameras[0], "Camera2D")!;
      cutoffY = cam.y + 600 + this.margin;
    }

    // 3. Despawn obstacle gaps and asteroids falling below the visible cutoff margin
    const gaps = world.query("ObstacleGap", "Transform");
    for (const gap of gaps) {
      const transform = world.getComponent(gap, "Transform")!;
      if (transform.y > cutoffY) {
        if (!world.isReSimulating) {
          // Visual-only cleanup effect guard
        }
        world.getCommandBuffer().removeEntity(gap);
      }
    }

    const asteroids = world.query("Health", "Transform", "Faction");
    for (const asteroid of asteroids) {
      if (world.hasComponent(asteroid, "Player")) continue;
      const transform = world.getComponent(asteroid, "Transform")!;
      if (transform.y > cutoffY) {
        if (!world.isReSimulating) {
          // Visual-only cleanup effect guard
        }
        world.getCommandBuffer().removeEntity(asteroid);
      }
    }
  }
}
