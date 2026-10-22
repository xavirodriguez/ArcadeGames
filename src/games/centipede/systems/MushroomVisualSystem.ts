import { System, World } from "@tiny-aster/core";
import { CentipedeComponentRegistry, CentipedeEventRegistry } from "../types/CentipedeTypes";

export class MushroomVisualSystem extends System<CentipedeComponentRegistry, CentipedeEventRegistry> {
  public update(world: World<CentipedeComponentRegistry, CentipedeEventRegistry>, dt: number): void {
    const mushrooms = world.query("MushroomVisual");

    for (const entity of mushrooms) {
      const vis = world.getMutableComponent(entity, "MushroomVisual");
      if (!vis) continue;

      if (vis.growProgress < 1.0) {
        vis.growProgress = Math.min(1.0, vis.growProgress + dt * 3.33);
      }

      if (vis.flashTimerMs > 0) {
        vis.flashTimerMs = Math.max(0, vis.flashTimerMs - dt * 1000);
      }
    }
  }
}
