import { System, World, WorldUtils, Juice } from "@tiny-aster/core";
import { ShmupComponentRegistry, ShmupEventRegistry } from "../types/ShmupTypes";
import { ShmupConfig } from "../types/ShmupConfigSchema";
import { spawnLayeredExplosion } from "../../shared/rendering/SharedVFX";
import { createEnemy } from "../EntityFactory";

export class ShmupCollisionSystem extends System<ShmupComponentRegistry, ShmupEventRegistry> {
  update(world: World<ShmupComponentRegistry, ShmupEventRegistry>, deltaTime: number): void {
    const config = world.getResource<ShmupConfig>("GameConfig");
    const worldWidth = config?.WORLD_WIDTH ?? 480;

    // 1. Process Enemy Destruction
    for (const entity of world.query("ShmupEnemy", "Health")) {
      const health = world.getComponent(entity, "Health");
      const enemy = world.getComponent(entity, "ShmupEnemy");
      if (!health || !enemy || health.current > 0) continue;

      const transform = world.getComponent(entity, "Transform");
      if (transform) {
        spawnLayeredExplosion(world, transform.x, transform.y, { type: "enemy" });
        Juice.playHitJuice(world, entity, { shakeIntensity: 2.0, shakeDuration: 80 });
      }

      world.mutateSingleton("ShmupGameState", (state) => {
        state.score += enemy.score;
      });
      world.getEventBus()?.emitDeferred("shmup:kill", { entity, score: enemy.score });
      WorldUtils.removeOrReclaim(world, entity);
    }

    // 2. Process Player Damage, Invulnerability & Lives Sync
    for (const entity of world.query("ShmupPlayer", "Health")) {
      const health = world.getMutableComponent(entity, "Health");
      if (!health) continue;

      world.mutateSingleton("ShmupGameState", (state) => {
        state.lives = Math.max(0, health.current);
      });

      if (health.current <= 0) {
        const transform = world.getComponent(entity, "Transform");
        if (transform) {
          spawnLayeredExplosion(world, transform.x, transform.y, { type: "ship" });
          Juice.playDeathJuice(world, entity, { shakeIntensity: 6.0, shakeDuration: 180 });
        }
        world.mutateSingleton("ShmupGameState", (state) => {
          state.isGameOver = true;
        });
      }
    }

    // 3. Wave Progression & Enemy Spawning
    const activeEnemies = world.query("ShmupEnemy");
    const state = world.getSingleton("ShmupGameState");

    if (state && !state.isGameOver) {
      if (activeEnemies.length === 0) {
        // All wave enemies cleared -> advance wave
        const nextWave = state.wave + 1;
        world.mutateSingleton("ShmupGameState", (s) => {
          s.wave = nextWave;
          s.spawnTimer = 0;
        });

        world.getEventBus()?.emitDeferred("shmup:wave_complete", { wave: nextWave });
        world.getEventBus()?.emitDeferred("PlaySFX", { name: "level_complete" });

        // Spawn new enemy wave above screen
        const enemyCount = 5 + Math.min(10, nextWave * 2);
        const rng = world.gameplayRandom;

        for (let i = 0; i < enemyCount; i++) {
          const kind = i % 3 === 0 ? "sine" : i % 2 === 0 ? "arc" : "straight";
          const startX = 50 + rng.next() * (worldWidth - 100);
          const startY = -40 - i * 50;
          createEnemy(world, startX, startY, kind);
        }
      }
    }
  }
}
