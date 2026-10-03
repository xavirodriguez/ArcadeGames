import { World } from "@tiny-aster/core";
import { ShmupComponentRegistry } from "../types/ShmupTypes";

export class EnemyPathSystem {
  update(world: World<ShmupComponentRegistry>, deltaTime: number): void {
    for (const entity of world.query("ShmupEnemy", "EnemyPath", "Transform")) {
      const path = world.getMutableComponent(entity, "EnemyPath");
      const transform = world.getMutableComponent(entity, "Transform");
      if (!path || !transform) continue;
      path.elapsed += deltaTime;
      const t = path.elapsed;
      if (path.kind === "sine") {
        transform.x = path.originX + Math.sin(t * path.frequency) * path.amplitude;
      } else if (path.kind === "arc") {
        const progress = Math.min(1, t / path.duration);
        transform.x = path.originX + Math.sin(progress * Math.PI) * path.amplitude;
      }
      transform.dirty = true;
    }
  }
}
