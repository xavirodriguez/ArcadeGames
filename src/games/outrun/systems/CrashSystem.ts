import { System, World } from "@tiny-aster/core";
import type {
  OutrunComponentRegistry,
  OutrunEventRegistry
} from "../types/OutrunTypes";
import { isOutrunCrashing } from "../types/OutrunTypes";
import { resolveOutrunSystemContext } from "./OutrunSystemUtils";

const TWO_PI = Math.PI * 2;

/**
 * Advances the classic Out Run tumble: spin the car, bleed speed, drift laterally,
 * then snap upright when the timer expires. Runs in Simulation after traffic so a
 * same-frame collision still starts the sequence before the next input tick.
 */
export class CrashSystem extends System<OutrunComponentRegistry, OutrunEventRegistry> {
  public override update(
    world: World<OutrunComponentRegistry, OutrunEventRegistry>,
    deltaTime: number
  ): void {
    const ctx = resolveOutrunSystemContext(world);
    if (!ctx) return;
    const { config } = ctx;
    const elapsed = Math.max(0, deltaTime);
    if (elapsed === 0) return;

    world.mutateSingleton("RaceState", (state) => {
      if (state.racePhase === "finished" || state.isGameOver) return;
      if (!isOutrunCrashing(state)) {
        // Keep residual spin cleared when idle so presentation stays upright.
        if ((state.crashSpin ?? 0) !== 0) state.crashSpin = 0;
        return;
      }

      const duration = Math.max(0.05, config.crashDurationSeconds);
      const spinRate = config.crashSpinRadiansPerSecond;
      const dir = state.crashDir === -1 ? -1 : 1;
      const remaining = Math.max(0, (state.crashRemaining ?? 0) - elapsed);

      state.crashSpin = (state.crashSpin ?? 0) + dir * spinRate * elapsed;
      state.speed = Math.max(0, state.speed - config.crashDecel * elapsed);
      // Mild outward slide during the tumble (arcade shove, not full physics).
      state.playerX = Math.max(-2, Math.min(2, state.playerX + dir * 0.35 * elapsed));
      state.crashRemaining = remaining;

      if (remaining <= 0.001) {
        state.crashRemaining = 0;
        state.crashDir = 0;
        // Settle to the nearest upright multiple of 2π so the body faces the road.
        const spin = state.crashSpin ?? 0;
        state.crashSpin = Math.round(spin / TWO_PI) * TWO_PI;
        // Soft floor so the player is not left completely stopped after a tumble.
        if (state.speed < config.maxSpeed * 0.08) {
          state.speed = config.maxSpeed * 0.08;
        }
      }

      // Guard against pathological long frames: never exceed configured duration.
      if ((state.crashRemaining ?? 0) > duration) {
        state.crashRemaining = duration;
      }
    });
  }
}
