import { System, World, WorldUtils } from "@tiny-aster/core";
import { ShmupComponentRegistry, ShmupEventRegistry } from "../types/ShmupTypes";
import { spawnLayeredExplosion } from "../../shared/rendering/SharedVFX";

export class ShmupCollisionSystem extends System<ShmupComponentRegistry, ShmupEventRegistry> {
  update(world: World<ShmupComponentRegistry, ShmupEventRegistry>, _deltaTime: number): void {
    for (const entity of world.query("ShmupEnemy", "Health")) {
      const health = world.getComponent(entity, "Health");
      const enemy = world.getComponent(entity, "ShmupEnemy");
      if (!health || !enemy || health.current > 0) continue;

      const transform = world.getComponent(entity, "Transform");
      if (transform) {
        spawnLayeredExplosion(world, transform.x, transform.y, { type: "enemy" });
      }

      world.mutateSingleton("ShmupGameState", (state) => {
        state.score += enemy.score;
      });
      world.getEventBus()?.emitDeferred("shmup:kill", { entity, score: enemy.score });
      WorldUtils.removeOrReclaim(world, entity);
    }
    for (const entity of world.query("ShmupPlayer", "Health")) {
      const health = world.getComponent(entity, "Health");
      if (health?.current !== undefined && health.current <= 0) {
        const transform = world.getComponent(entity, "Transform");
        if (transform) {
          spawnLayeredExplosion(world, transform.x, transform.y, { type: "ship" });
        }
        world.mutateSingleton("ShmupGameState", (state) => {
          state.isGameOver = true;
        });
      }
    }
  }
}
