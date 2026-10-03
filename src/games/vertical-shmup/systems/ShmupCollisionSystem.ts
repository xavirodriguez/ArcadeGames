import { World, WorldUtils, Juice } from "@tiny-aster/core";
import { ShmupComponentRegistry } from "../types/ShmupTypes";

export class ShmupCollisionSystem {
  update(world: World<ShmupComponentRegistry>): void {
    for (const entity of world.query("ShmupEnemy", "Health")) {
      const health = world.getComponent(entity, "Health");
      if (!health || health.current > 0) continue;
      const enemy = world.getComponent(entity, "ShmupEnemy");
      if (!enemy) continue;
      const state = world.getSingleton("ShmupGameState");
      if (state) state.score += enemy.score;
      world.getEventBus()?.emitDeferred("shmup:kill", { entity, score: enemy.score });
      WorldUtils.removeOrReclaim(world, entity);
    }
    for (const entity of world.query("ShmupPlayer", "Health")) {
      const health = world.getComponent(entity, "Health");
      if (health && health.current <= 0) {
        const state = world.getSingleton("ShmupGameState");
        if (state) state.isGameOver = true;
      }
    }
  }
}
