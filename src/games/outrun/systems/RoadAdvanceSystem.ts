import { System, World } from "@tiny-aster/core";
import type { OutrunConfig } from "../types/OutrunConfigSchema";
import { DEFAULT_OUTRUN_CONFIG } from "../types/OutrunConfigSchema";
import type {
  OutrunComponentRegistry,
  OutrunEventRegistry,
  RoadData
} from "../types/OutrunTypes";

/**
 * Advances playerZ by current speed and applies centrifugal force from road curve.
 * Runs in Simulation phase after input has updated speed / playerX.
 */
// TODO(refactor): código duplicado detectado (bloque) con outrun/systems/RacerInputSystem.ts:10-21. Considerar extraer a función compartida. Ref: e704905e
export class RoadAdvanceSystem extends System<OutrunComponentRegistry, OutrunEventRegistry> {
  public override update(
    world: World<OutrunComponentRegistry, OutrunEventRegistry>,
    deltaTime: number
  ): void {
    if (world.getResource("IsPaused") === true) return;

    const state = world.getSingleton("RaceState");
    if (!state || state.isGameOver) return;

    const config =
      world.getResource<OutrunConfig>("GameConfig") ?? DEFAULT_OUTRUN_CONFIG;
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

      let z = s.playerZ % trackLength;
      if (z < 0) z += trackLength;
      let accum = 0;
      let segIndex = 0;
      for (let i = 0; i < roadData.segments.length; i++) {
        const len = roadData.segments[i].length;
        if (accum + len > z) {
          segIndex = i;
          break;
        }
        accum += len;
      }
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
