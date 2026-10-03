import { System, World } from "@tiny-aster/core";
import type { RacingComponentRegistry, RacingEventRegistry } from "../types/RacingRegistry";
import type { RacingConfig } from "../types/RacingConfigSchema";

function insideCheckpoint(x: number, y: number, cx: number, cy: number, width: number, height: number): boolean {
  return Math.abs(x - cx) <= width / 2 && Math.abs(y - cy) <= height / 2;
}

export class LapSystem extends System<RacingComponentRegistry, RacingEventRegistry> {
  constructor(private readonly config: RacingConfig) { super(); }

  public update(world: World<RacingComponentRegistry, RacingEventRegistry>): void {
    const state = world.getSingleton("RacingState");
    const car = world.query("LocalPlayer", "Transform", "Lap")[0];
    if (!state || car === undefined || state.phase !== "racing") return;
    const transform = world.getComponent(car, "Transform");
    const lap = world.getMutableComponent(car, "Lap");
    if (!transform || !lap) return;

    const checkpoints = world.query("Checkpoint", "Transform");
    for (let i = 0; i < checkpoints.length; i += 1) {
      const checkpointEntity = checkpoints[i];
      const checkpoint = world.getComponent(checkpointEntity, "Checkpoint");
      const checkpointTransform = world.getComponent(checkpointEntity, "Transform");
      if (!checkpoint || !checkpointTransform) continue;

      const expected = lap.lastCheckpoint + 1;
      if (checkpoint.index !== expected && !(checkpoint.index === 0 && lap.lastCheckpoint === checkpoints.length - 1)) continue;
      if (!insideCheckpoint(transform.x, transform.y, checkpointTransform.x, checkpointTransform.y, checkpoint.width, checkpoint.height)) continue;

      if (checkpoint.index === 0 && lap.lastCheckpoint === checkpoints.length - 1) {
        const lapTime = state.raceTime - lap.lapStartedAt;
        lap.currentLap += 1;
        lap.lastCheckpoint = 0;
        lap.lastLapTime = lapTime;
        lap.bestLapTime = lap.bestLapTime === null ? lapTime : Math.min(lap.bestLapTime, lapTime);
        lap.lapStartedAt = state.raceTime;
        world.getEventBus().emitDeferred("lap:completed", { lap: lap.currentLap - 1, lapTime });
        if (lap.currentLap > this.config.TOTAL_LAPS) {
          world.getEventBus().emitDeferred("race:finished", { totalTime: state.raceTime, laps: this.config.TOTAL_LAPS });
        }
      } else {
        lap.lastCheckpoint = checkpoint.index;
        world.getEventBus().emitDeferred("racing:checkpoint", { checkpoint: checkpoint.index });
      }
    }
  }

  public onRegister(_world: World<RacingComponentRegistry, RacingEventRegistry>): void {}
  public dispose(): void {}
}
