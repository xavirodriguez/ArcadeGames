import { World } from "@tiny-aster/core";
import { ShmupComponentRegistry } from "../types/ShmupTypes";
import { ShmupConfig } from "../types/ShmupConfigSchema";

export class ScrollSystem {
  update(world: World<ShmupComponentRegistry>, deltaTime: number): void {
    const config = world.getResource<ShmupConfig>("GameConfig");
    if (!config) return;
    const state = world.getSingleton("ShmupGameState");
    if (state) state.scrollDistance += config.SCROLL_SPEED * deltaTime;
    const camera = world.query("Camera2D")[0];
    if (camera !== undefined) {
      const c = world.getMutableComponent(camera, "Camera2D");
      if (c) { c.targetY += config.SCROLL_SPEED * deltaTime; }
    }
  }
}
