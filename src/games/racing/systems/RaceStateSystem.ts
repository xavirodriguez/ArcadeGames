import { System, World } from "@tiny-aster/core";
import type { RacingComponentRegistry, RacingEventRegistry } from "../types/RacingRegistry";
import type { RacingConfig } from "../types/RacingConfigSchema";

export class RaceStateSystem extends System<RacingComponentRegistry, RacingEventRegistry> {
  constructor(private readonly config: RacingConfig) { super(); }

  public update(world: World<RacingComponentRegistry, RacingEventRegistry>, deltaTime: number): void {
    const state = world.getSingleton("RacingState");
    if (!state) return;

    if (state.phase === "countdown") {
      const previous = state.countdownRemaining;
      state.countdownRemaining = Math.max(0, previous - deltaTime);
      if (Math.ceil(previous) !== Math.ceil(state.countdownRemaining)) {
        world.getEventBus().emitDeferred("race:countdown", { remaining: Math.ceil(state.countdownRemaining) });
      }
      if (state.countdownRemaining === 0) state.phase = "racing";
      return;
    }

    if (state.phase !== "racing") return;
    state.raceTime += deltaTime;

    const car = world.query("LocalPlayer", "Lap")[0];
    if (car === undefined) return;
    const lap = world.getComponent(car, "Lap");
    if (!lap) return;
    state.currentLap = Math.min(lap.currentLap, this.config.TOTAL_LAPS);
    state.lastLapTime = lap.lastLapTime;
    state.bestLapTime = lap.bestLapTime;
  }

  public onRegister(_world: World<RacingComponentRegistry, RacingEventRegistry>): void {}
  public dispose(): void {}
}
