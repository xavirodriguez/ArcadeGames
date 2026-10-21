import { System, World } from "@tiny-aster/core";
import { GalaxianComponentRegistry, GalaxianEnemyComponent, DiveTrailComponent } from "../types/GalaxianTypes";

export class DiveTrailVisualSystem extends System<GalaxianComponentRegistry> {
  public update(world: World<GalaxianComponentRegistry>, _deltaTime: number): void {
    const enemyEntities = world.query("GalaxianEnemy", "Transform", "DiveTrail");
    for (const entity of enemyEntities) {
      const enemy = world.getComponent(entity, "GalaxianEnemy") as GalaxianEnemyComponent | undefined;
      const transform = world.getComponent(entity, "Transform");
      const trail = world.getMutableComponent(entity, "DiveTrail") as DiveTrailComponent | undefined;
      if (!enemy || !transform || !trail) continue;

      if (enemy.state === "diving" || enemy.state === "windup") {
        trail.history.unshift({ x: transform.x, y: transform.y });
        if (trail.history.length > trail.maxHistory) {
          trail.history.pop();
        }
      } else {
        if (trail.history.length > 0) {
          trail.history = [];
        }
      }
    }
  }
}
