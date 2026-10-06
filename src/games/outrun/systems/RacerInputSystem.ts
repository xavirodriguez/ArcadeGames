import { System, World } from "@tiny-aster/core";
import type { OutrunConfig } from "../types/OutrunConfigSchema";
import { DEFAULT_OUTRUN_CONFIG } from "../types/OutrunConfigSchema";
import type { OutrunComponentRegistry, OutrunEventRegistry } from "../types/OutrunTypes";

/**
 * Reads player input (accelerate / brake / steer) and updates RaceState.
 * Runs in Input phase. Simulation systems consume the resulting speed / playerX.
 */
export class RacerInputSystem extends System<OutrunComponentRegistry, OutrunEventRegistry> {
  public override update(
    world: World<OutrunComponentRegistry, OutrunEventRegistry>,
    deltaTime: number
  ): void {
    if (world.getResource("IsPaused") === true) return;

    const state = world.getSingleton("RaceState");
    if (!state || state.isGameOver) return;

    const config =
      world.getResource<OutrunConfig>("GameConfig") ?? DEFAULT_OUTRUN_CONFIG;

    let accelerate = false;
    let brake = false;
    let left = false;
    let right = false;

    const inputSys =
      world.getResource<{
        getAction?: (a: string) => boolean;
        isActionActive?: (a: string) => boolean;
      }>("InputSystem") ||
      world.getResource<{
        getAction?: (a: string) => boolean;
        isActionActive?: (a: string) => boolean;
      }>("UnifiedInput");

    if (inputSys) {
      if (typeof inputSys.getAction === "function") {
        accelerate = !!inputSys.getAction("accelerate");
        brake = !!inputSys.getAction("brake");
        left = !!inputSys.getAction("left");
        right = !!inputSys.getAction("right");
      } else if (typeof inputSys.isActionActive === "function") {
        accelerate = !!inputSys.isActionActive("accelerate");
        brake = !!inputSys.isActionActive("brake");
        left = !!inputSys.isActionActive("left");
        right = !!inputSys.isActionActive("right");
      }
    }

    const frame = world.getResource<{
      actions?: Record<string, boolean>;
      axes?: Record<string, number>;
    }>("CurrentInputFrame");
    if (frame) {
      if (frame.actions) {
        accelerate = accelerate || !!frame.actions["accelerate"];
        brake = brake || !!frame.actions["brake"];
        left = left || !!frame.actions["left"];
        right = right || !!frame.actions["right"];
      }
      if (frame.axes) {
        const ax = frame.axes["steer"] ?? frame.axes["moveX"] ?? 0;
        if (ax < -0.2) left = true;
        if (ax > 0.2) right = true;
        const thr = frame.axes["throttle"] ?? 0;
        if (thr > 0.2) accelerate = true;
        if (thr < -0.2) brake = true;
      }
    }

    world.mutateSingleton("RaceState", (s) => {
      let speed = s.speed;

      if (accelerate) {
        speed += config.accel * deltaTime;
      } else if (brake) {
        speed -= config.brake * deltaTime;
      } else {
        speed -= config.decel * deltaTime;
      }

      const absX = Math.abs(s.playerX);
      if (absX > 1) {
        if (speed > config.offRoadLimit) {
          speed -= config.offRoadDecel * deltaTime;
        }
      }

      speed = Math.max(0, Math.min(config.maxSpeed, speed));

      const speedRatio = speed / config.maxSpeed;
      const steerAmount = config.steerSpeed * speedRatio * deltaTime;
      let playerX = s.playerX;
      if (left) playerX -= steerAmount;
      if (right) playerX += steerAmount;
      playerX = Math.max(-2, Math.min(2, playerX));

      s.speed = speed;
      s.playerX = playerX;
    });
  }
}
