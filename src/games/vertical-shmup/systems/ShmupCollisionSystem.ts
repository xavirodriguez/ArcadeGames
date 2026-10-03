import { World, WorldUtils } from "@tiny-aster/core";
import { ShmupComponentRegistry } from "../types/ShmupTypes";
export class ShmupCollisionSystem {
  update(world: World<ShmupComponentRegistry>): void {
    for (const entity of world.query("ShmupEnemy", "Health")) {
      const health = world.getComponent(entity, "Health");
      const enemy = world.getComponent(entity, "ShmupEnemy");
      if (!health || !enemy || health.current > 0) continue;
      const state = world.getSingleton("ShmupGameState");
      if (state) state.score += enemy.score;
      world.getEventBus()?.emitDeferred("shmup:kill", { entity, score: enemy.score });
      WorldUtils.removeOrReclaim(world, entity);
    }
    for (const entity of world.query("ShmupPlayer", "Health")) {
      const health = world.getComponent(entity, "Health");
      if (health?.current !== undefined && health.current <= 0) world.getSingleton("ShmupGameState")!.isGameOver = true;
    }
  }
}
