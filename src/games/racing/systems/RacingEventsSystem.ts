import { System, World } from "@tiny-aster/core";
import type { RacingComponentRegistry, RacingEventRegistry } from "../types/RacingRegistry";

export class RacingEventsSystem extends System<RacingComponentRegistry, RacingEventRegistry> {
  public update(_world: World<RacingComponentRegistry, RacingEventRegistry>): void {}

  public onRegister(world: World<RacingComponentRegistry, RacingEventRegistry>): void {
    world.getEventBus().on("race:finished", (event) => {
      const state = world.getMutableSingleton("RacingState");
      if (!state) return;
      state.phase = "finished";
      state.isGameOver = true;
      state.position = 1;
      state.raceTime = event.totalTime;
    });
  }

  public dispose(): void {}
}
