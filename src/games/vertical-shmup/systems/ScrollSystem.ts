import { System, World } from "@tiny-aster/core";
import { ShmupComponentRegistry, ShmupEventRegistry } from "../types/ShmupTypes";
import { ShmupConfig } from "../types/ShmupConfigSchema";

export class ScrollSystem extends System<ShmupComponentRegistry, ShmupEventRegistry> {
  update(world: World<ShmupComponentRegistry, ShmupEventRegistry>, deltaTime: number): void {
    const config = world.getResource<ShmupConfig>("GameConfig");
    if (!config) return;
    world.mutateSingleton("ShmupGameState", (state) => {
      state.scrollDistance += config.SCROLL_SPEED * deltaTime;
    });
    const camera = world.query("Camera2D")[0];
    if (camera !== undefined) {
      const c = world.getMutableComponent(camera, "Camera2D");
      if (c) { c.targetY += config.SCROLL_SPEED * deltaTime; }
    }
  }
}
