import { System, World } from "@tiny-aster/core";
import type { RacingComponentRegistry, RacingEventRegistry } from "../types/RacingRegistry";
import type { RacingConfig } from "../types/RacingConfigSchema";

function insideCheckpoint(
  x: number,
  y: number,
  cx: number,
  cy: number,
  width: number,
  height: number
): boolean {
  return Math.abs(x - cx) <= width / 2 && Math.abs(y - cy) <= height / 2;
}

/**
 * Advances lap / checkpoint state for every competing car.
 * Human-only side-effects (events + lap timing) are gated behind LocalPlayer.
 */
export class LapSystem extends System<RacingComponentRegistry, RacingEventRegistry> {
  constructor(private readonly config: RacingConfig) {
    super();
  }

  public update(world: World<RacingComponentRegistry, RacingEventRegistry>): void {
    const state = world.getSingleton("RacingState");
    if (!state || state.phase !== "racing") return;

    // Head-to-head rounds also pause checkpoint counting outside "racing"
    const h2h = world.getSingleton("HeadToHeadState");
    if (h2h && h2h.phase !== "racing") return;

    const cars = world.query("Car", "Transform", "Lap");
    if (cars.length === 0) return;

    // Materialise ordered checkpoint list once (index order, not ECS query order)
    const checkpointEntities = world.query("Checkpoint", "Transform");
    const ordered: Array<{
      entity: number;
      index: number;
      x: number;
      y: number;
      width: number;
      height: number;
    }> = [];

    for (let i = 0; i < checkpointEntities.length; i += 1) {
      const entity = checkpointEntities[i]!;
      const cp = world.getComponent(entity, "Checkpoint");
      const tr = world.getComponent(entity, "Transform");
      if (!cp || !tr) continue;
      ordered.push({
        entity,
        index: cp.index,
        x: tr.x,
        y: tr.y,
        width: cp.width,
        height: cp.height
      });
    }
    ordered.sort((a, b) => a.index - b.index);
    const totalCheckpoints = ordered.length;
    if (totalCheckpoints === 0) return;

    const totalLaps = this.config.TOTAL_LAPS;

    for (let c = 0; c < cars.length; c += 1) {
      const car = cars[c]!;
      const transform = world.getComponent(car, "Transform");
      const lap = world.getMutableComponent(car, "Lap");
      if (!transform || !lap) continue;

      // AI that already finished all laps stop progressing
      const isHuman = world.hasComponent(car, "LocalPlayer");
      if (!isHuman && lap.currentLap > totalLaps) continue;

      for (let i = 0; i < ordered.length; i += 1) {
        const checkpoint = ordered[i]!;
        const expected = lap.lastCheckpoint + 1;

        // Accept either the sequential next index, or wrapping finish-line (0 after last)
        const isSequential = checkpoint.index === expected;
        const isLapWrap =
          checkpoint.index === 0 && lap.lastCheckpoint === totalCheckpoints - 1;
        if (!isSequential && !isLapWrap) continue;

        if (
          !insideCheckpoint(
            transform.x,
            transform.y,
            checkpoint.x,
            checkpoint.y,
            checkpoint.width,
            checkpoint.height
          )
        ) {
          continue;
        }

        if (isLapWrap) {
          // Complete a lap
          if (!isHuman && lap.currentLap >= totalLaps) {
            // AI has finished — freeze progress, do not emit race events
            lap.currentLap = totalLaps + 1;
            lap.lastCheckpoint = 0;
            // Soft-stop navigation if steering components exist
            const vehicle = world.getMutableComponent(car, "VehicleSteering");
            if (vehicle) {
              vehicle.throttle = 0;
              vehicle.steering = 0;
            }
            break;
          }

          const lapTime = state.raceTime - lap.lapStartedAt;
          lap.currentLap += 1;
          lap.lastCheckpoint = 0;

          if (isHuman) {
            lap.lastLapTime = lapTime;
            lap.bestLapTime =
              lap.bestLapTime === null ? lapTime : Math.min(lap.bestLapTime, lapTime);
            lap.lapStartedAt = state.raceTime;
            world.getEventBus().emitDeferred("lap:completed", {
              lap: lap.currentLap - 1,
              lapTime
            });
            if (lap.currentLap > totalLaps) {
              world.getEventBus().emitDeferred("race:finished", {
                totalTime: state.raceTime,
                laps: totalLaps
              });
            }
          }
        } else {
          // Intermediate checkpoint
          lap.lastCheckpoint = checkpoint.index;
          if (isHuman) {
            world.getEventBus().emitDeferred("racing:checkpoint", {
              checkpoint: checkpoint.index
            });
          }
        }
        // Only one checkpoint advance per car per tick
        break;
      }
    }
  }

  public onRegister(_world: World<RacingComponentRegistry, RacingEventRegistry>): void {}
  public dispose(): void {}
}
