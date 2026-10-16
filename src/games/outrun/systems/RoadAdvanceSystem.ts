import { System, World } from "@tiny-aster/core";
import type {
  OutrunComponentRegistry,
  OutrunEventRegistry,
  RoadData
} from "../types/OutrunTypes";
import { resolveOutrunSystemConfig } from "./OutrunSystemUtils";
import { findSegmentIndexAtZ } from "./TrafficSteering";

/**
 * Advances playerZ by current speed and applies centrifugal force from road curve.
 * Runs in Simulation phase after input has updated speed / playerX.
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

    world.mutateSingleton("RaceState", (s) => {
      const phase = s.racePhase ?? "racing";

      if (phase === "countdown") {
        const cd = (s.countdownTime ?? 3) - deltaTime;
        s.countdownTime = cd;
        if (cd <= 0) {
          s.racePhase = "racing";
          s.countdownTime = 0;
        }
        return;
      }

      s.playerZ += s.speed * deltaTime;
      if (s.playerZ >= trackLength) {
        s.playerZ -= trackLength;
      } else if (s.playerZ < 0) {
        s.playerZ += trackLength;
      }

      s.lapTime += deltaTime;

      // Multi-segment jumps are safe: findSegmentIndexAtZ scans the full track
      const segIndex = findSegmentIndexAtZ(roadData.segments, s.playerZ, trackLength);
      s.currentSegment = segIndex;

      const curve = roadData.segments[segIndex].curve;
      const speedRatio = s.speed / config.maxSpeed;
      const centrifugal =
        curve * config.centrifugalForce * speedRatio * speedRatio * deltaTime;
      s.playerX -= centrifugal;
      s.playerX = Math.max(-2, Math.min(2, s.playerX));
    });
  }
}
