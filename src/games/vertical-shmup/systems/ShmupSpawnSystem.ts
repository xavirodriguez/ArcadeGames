import { System, World } from "@tiny-aster/core";
import { ShmupComponentRegistry, ShmupEventRegistry } from "../types/ShmupTypes";
import { ShmupConfig } from "../types/ShmupConfigSchema";
import { createEnemy } from "../EntityFactory";

export class ShmupSpawnSystem extends System<ShmupComponentRegistry, ShmupEventRegistry> {
  update(world: World<ShmupComponentRegistry, ShmupEventRegistry>, deltaTime: number): void {
    if (world.getResource("IsPaused") === true) return;
    const config = world.getResource<ShmupConfig>("GameConfig");
    if (!config) return;

    const state = world.getSingleton("ShmupGameState");
    if (!state || state.isGameOver) return;

    const activeEnemies = world.query("ShmupEnemy");
    const maxEnemies = 5 + Math.min(10, state.wave * 2);

    // 1. Check for wave clearance and advance wave
    if (activeEnemies.length === 0) {
      const nextWave = state.wave + 1;
      world.mutateSingleton("ShmupGameState", (s) => {
        s.wave = nextWave;
        s.spawnTimer = 0;
      });

      world.getEventBus()?.emitDeferred("shmup:wave_complete", { wave: nextWave });
      world.getEventBus()?.emitDeferred("PlaySFX", { name: "level_complete" });

      // Spawn initial enemy squad for new wave
      const rng = world.gameplayRandom;
      const squadCount = Math.min(6, 4 + Math.floor(nextWave / 2));
      for (let i = 0; i < squadCount; i++) {
        const kind = i % 3 === 0 ? "sine" : i % 2 === 0 ? "arc" : "straight";
        const startX = 50 + rng.next() * (config.WORLD_WIDTH - 100);
        const startY = -40 - i * 45;
        createEnemy(world, startX, startY, kind, nextWave);
      }
      return;
    }

    // 2. Continuous interval spawning when under wave capacity
    world.mutateSingleton("ShmupGameState", (s) => {
      s.spawnTimer += deltaTime;
    });

    if (state.spawnTimer >= config.SPAWN_INTERVAL) {
      world.mutateSingleton("ShmupGameState", (s) => {
        s.spawnTimer = 0;
      });

      if (activeEnemies.length < maxEnemies) {
        const rng = world.gameplayRandom;
        const kinds: Array<"straight" | "sine" | "arc"> = ["straight", "sine", "arc"];
        const kindIndex = Math.floor(rng.next() * kinds.length);
        const kind = kinds[kindIndex] ?? "straight";
        const startX = 50 + rng.next() * (config.WORLD_WIDTH - 100);
        createEnemy(world, startX, -40, kind, state.wave);
      }
    }
  }
}
