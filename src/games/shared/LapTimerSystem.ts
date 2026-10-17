import { System, World, CoreComponentRegistry, Entity, LapTrackerComponent } from "@tiny-aster/core";

export { LapTrackerComponent };

/**
 * Creates a new {@link LapTrackerComponent}.
 *
 * @param config - Lap tracking parameters.
 * @returns Initialized LapTrackerComponent.
 * @public
 */
export function createLapTracker(config: {
  totalLaps: number;
  totalCheckpoints: number;
}): LapTrackerComponent {
  return {
    type: "LapTracker",
    currentLap: 1,
    totalLaps: config.totalLaps,
    currentLapTime: 0,
    nextCheckpointIndex: 0,
    totalCheckpoints: config.totalCheckpoints,
    totalRaceTime: 0,
    isFinished: false,
  };
}

/**
 * System managing race lap timing, sequential checkpoint validation, best lap records, and ghost replay hooks.
 *
 * @public
 */
export class LapTimerSystem extends System<CoreComponentRegistry> {
  /**
   * Processes a checkpoint collision for a racer entity.
   *
   * @param world - Simulation world.
   * @param racerEntity - Entity ID of the racer crossing the checkpoint.
   * @param checkpointIndex - Index of the crossed checkpoint.
   * @returns `true` if checkpoint cross was valid and advanced progression; `false` otherwise.
   * @public
   */
  public static passCheckpoint(
    world: World<CoreComponentRegistry>,
    racerEntity: Entity,
    checkpointIndex: number
  ): boolean {
    const tracker = world.getMutableComponent(racerEntity, "LapTracker");
    if (!tracker || tracker.isFinished) return false;

    if (checkpointIndex !== tracker.nextCheckpointIndex) {
      return false; // Wrong checkpoint order
    }

    const eventBus = world.getEventBus();

    // Advance to next checkpoint
    tracker.nextCheckpointIndex = (tracker.nextCheckpointIndex + 1) % tracker.totalCheckpoints;

    if (eventBus) {
      eventBus.emit("checkpoint:passed", {
        entity: racerEntity,
        checkpointIndex,
        nextCheckpointIndex: tracker.nextCheckpointIndex,
      });
    }

    // If wrapped back to checkpoint 0, a lap was completed!
    if (tracker.nextCheckpointIndex === 0) {
      const completedLapTime = tracker.currentLapTime;
      tracker.lastLapTime = completedLapTime;

      let isNewBest = false;
      if (tracker.bestLapTime === undefined || completedLapTime < tracker.bestLapTime) {
        tracker.bestLapTime = completedLapTime;
        isNewBest = true;
      }

      if (eventBus) {
        eventBus.emit("lap:completed", {
          entity: racerEntity,
          lap: tracker.currentLap,
          lapTime: completedLapTime,
          bestLapTime: tracker.bestLapTime,
          isNewBest,
        });
      }

      tracker.currentLap++;
      tracker.currentLapTime = 0;

      if (tracker.currentLap > tracker.totalLaps) {
        tracker.isFinished = true;
        if (eventBus) {
          eventBus.emit("race:finished", {
            entity: racerEntity,
            totalRaceTime: tracker.totalRaceTime,
            bestLapTime: tracker.bestLapTime,
          });
        }
      }
    }

    return true;
  }

  /**
   * Updates lap timers and total race durations for unfinished racers.
   *
   * @param world - Simulation world.
   * @param deltaTime - Frame duration in seconds.
   */
  public update(world: World<CoreComponentRegistry>, deltaTime: number): void {
    if (world.getResource("IsPaused") === true || deltaTime <= 0) return;

    const entities = world.query("LapTracker");
    const len = entities.length;

    for (let i = 0; i < len; i++) {
      const entity = entities[i];
      const tracker = world.getMutableComponent(entity, "LapTracker");
      if (!tracker || tracker.isFinished) continue;

      tracker.currentLapTime += deltaTime;
      tracker.totalRaceTime += deltaTime;
    }
  }
}
