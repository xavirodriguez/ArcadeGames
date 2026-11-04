import { System, World } from "@tiny-aster/core";
import { GalaxianComponentRegistry, GalaxianStateComponent } from "../types/GalaxianTypes";
import { spawnEnemyWave } from "../EntityFactory";
import { GalaxianConfig } from "../types/GalaxianConfigSchema";

const WAVE_TRANSITION_DURATION_SECONDS = 1.5;

export class WaveSystem extends System<GalaxianComponentRegistry> {
  public update(world: World<GalaxianComponentRegistry>, deltaTime: number): void {
    if (world.getResource("IsPaused") === true || deltaTime <= 0) return;

    const stateEntities = world.query("GameState");
    if (stateEntities.length === 0) return;
    const state = world.getMutableComponent(stateEntities[0], "GameState") as GalaxianStateComponent | undefined;
    if (!state || state.isGameOver) return;

    if (state.waveTransitionRemaining > 0) {
      state.waveTransitionRemaining = Math.max(0, state.waveTransitionRemaining - deltaTime);
      if (
        state.waveTransitionRemaining === 0 &&
        !spawnEnemyWave(world)
      ) {
        // Keep the same transition active; a failed spawn must not advance the level again.
        state.waveTransitionRemaining = WAVE_TRANSITION_DURATION_SECONDS;
      }
      return;
    }

    // Collision removals are flushed after all phases. Wait until the last enemy is
    // actually gone before starting the next intermission.
    const config = world.getResource<GalaxianConfig>("GameConfig");
    const hasWaveDefinition = config?.formation.grid.some((rowConfig) => rowConfig.count > 0) === true;
    const hasFormation = world.query("Formation").length > 0;

    if (
      state.enemiesRemaining <= 0 &&
      world.query("GalaxianEnemy").length === 0 &&
      hasWaveDefinition &&
      hasFormation
    ) {
      const completedLevel = state.level;
      state.level = completedLevel + 1;
      state.activeDivesCount = 0;
      state.waveTransitionRemaining = WAVE_TRANSITION_DURATION_SECONDS;
      world.getEventBus()?.emit("wave:completed", { level: completedLevel });
    }
  }
}
