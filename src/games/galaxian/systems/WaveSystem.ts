import { System, World } from "@tiny-aster/core";
import { GalaxianComponentRegistry, GalaxianStateComponent } from "../types/GalaxianTypes";
import { spawnEnemyWave } from "../EntityFactory";

export class WaveSystem extends System<GalaxianComponentRegistry> {
  public update(world: World<GalaxianComponentRegistry>, deltaTime: number): void {
    if (world.getResource("IsPaused") === true || deltaTime <= 0) return;

    const stateEntities = world.query("GameState");
    if (stateEntities.length === 0) return;
    const state = world.getMutableComponent(stateEntities[0], "GameState") as GalaxianStateComponent | undefined;
    if (!state || state.isGameOver) return;

    if (state.waveTransitionRemaining > 0) {
      state.waveTransitionRemaining = Math.max(0, state.waveTransitionRemaining - deltaTime);
      if (state.waveTransitionRemaining === 0) {
        spawnEnemyWave(world);
      }
      return;
    }

    if (state.enemiesRemaining <= 0) {
      state.level++;
      state.waveTransitionRemaining = 1.5;
      world.getEventBus()?.emit("wave:completed", { level: state.level });
    }
  }
}
