import { System, World } from "@tiny-aster/core";
import type {
  OutrunComponentRegistry,
  OutrunEventRegistry,
  RoadData
} from "../types/OutrunTypes";
import { resolveOutrunSystemConfig } from "./OutrunSystemUtils";
import { findSegmentIndexAtZ } from "./TrafficSteering";

/**
 * Advances the player through one finite track, applies checkpoint time rewards,
 * and resolves the race result. The timer runs only while the race is active.
 */
export class RoadAdvanceSystem extends System<OutrunComponentRegistry, OutrunEventRegistry> {
  public override update(
    world: World<OutrunComponentRegistry, OutrunEventRegistry>,
    deltaTime: number
  ): void {
    const config = resolveOutrunSystemConfig(world);
    if (!config) return;
    const roadData = world.getResource<RoadData>("RoadData");
    if (!roadData || roadData.segments.length === 0) return;

    const trackLength = roadData.trackLength;
    if (trackLength <= 0) return;

    const elapsed = Math.max(0, deltaTime);
    const checkpointEvents: Array<{
      checkpoint: number;
      timeBonus: number;
      timeLeft: number;
    }> = [];
    let finishedLapTime: number | undefined;

    world.mutateSingleton("RaceState", (state) => {
      const phase = state.racePhase ?? "racing";
      if (phase === "finished" || state.isGameOver) return;

      if (phase === "countdown") {
        const currentCountdown = state.countdownTime ?? config.countdownDurationSeconds;
        if (currentCountdown > 0) {
          state.countdownTime = Math.max(0, currentCountdown - elapsed);
          return;
        }
        state.countdownTime = 0;
        state.racePhase = "racing";
      }

      if (elapsed === 0) return;

      const previousZ = state.playerZ;
      const nextZ = previousZ + Math.max(0, state.speed) * elapsed;
      const checkpoints = roadData.checkpoints ?? [];

      state.lapTime += elapsed;
      state.timeLeft = Math.max(
        0,
        (state.timeLeft ?? config.raceTimeLimitSeconds) - elapsed
      );

      let checkpointsPassed = state.checkpointsPassed ?? 0;
      while (checkpointsPassed < checkpoints.length) {
        const checkpointZ = checkpoints[checkpointsPassed]!;
        if (checkpointZ > nextZ) break;

        checkpointsPassed += 1;
        if (checkpointZ <= previousZ) continue;

        state.timeLeft += config.checkpointTimeBonusSeconds;
        checkpointEvents.push({
          checkpoint: checkpointsPassed,
          timeBonus: config.checkpointTimeBonusSeconds,
          timeLeft: state.timeLeft
        });
      }
      state.checkpointsPassed = checkpointsPassed;

      state.playerZ = Math.min(nextZ, trackLength);
      const segmentIndex = state.playerZ >= trackLength
        ? roadData.segments.length - 1
        : findSegmentIndexAtZ(roadData.segments, state.playerZ, trackLength);
      state.currentSegment = segmentIndex;

      const curve = roadData.segments[segmentIndex]?.curve ?? 0;
      const speedRatio = state.speed / config.maxSpeed;
      const centrifugal =
        curve * config.centrifugalForce * speedRatio * speedRatio * elapsed;
      state.playerX = Math.max(-2, Math.min(2, state.playerX - centrifugal));

      if (nextZ >= trackLength) {
        state.playerZ = trackLength;
        state.racePhase = "finished";
        state.isGameOver = true;
        state.finishReason = "finish";
        state.speed = 0;
        finishedLapTime = state.lapTime;
        return;
      }

      if (state.timeLeft <= 0) {
        state.timeLeft = 0;
        state.racePhase = "finished";
        state.isGameOver = true;
        state.finishReason = "timeout";
        state.speed = 0;
      }
    });

    for (const event of checkpointEvents) {
      world.getEventBus().emit("outrun:checkpoint", event);
    }
    if (finishedLapTime !== undefined) {
      world.getEventBus().emit("outrun:lap", { lapTime: finishedLapTime });
    }
  }
}
