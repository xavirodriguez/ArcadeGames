import { World, BlueprintRegistry } from "@tiny-aster/core";
import { SystemPhase } from "@tiny-aster/core";
import { HeadToHeadStateSystem } from "../systems/HeadToHeadStateSystem";
import { registerRacingBlueprints, spawnBlueprint } from "../EntityFactory";
import type { RacingComponentRegistry, RacingEventRegistry } from "../types/RacingRegistry";

describe("HeadToHeadStateSystem", () => {
  it("scores point when trailing car falls out of camera viewport and triggers round end", () => {
    const world = new World<RacingComponentRegistry, RacingEventRegistry>();
    const registry = new BlueprintRegistry<RacingComponentRegistry, RacingEventRegistry>();
    world.setResource("BlueprintRegistry", registry);

    const h2hSystem = new HeadToHeadStateSystem();

    registerRacingBlueprints(world, registry);

    world.addSystem(h2hSystem, { phase: SystemPhase.GameRules });

    // Setup main camera
    const cameraEntity = world.createEntity();
    world.addComponent(cameraEntity, {
      type: "Camera2D",
      x: 0,
      y: 0,
      targetX: 0,
      targetY: 0,
      zoom: 1,
      isMain: true
    });
    world.setResource("ScreenConfig", { width: 800, height: 600 });

    // Spawn HeadToHeadState
    const h2hEntity = world.createEntity();
    world.addComponent(h2hEntity, {
      type: "HeadToHeadState",
      leaderEntity: null,
      scores: { player_1: 0, player_2: 0 },
      targetScore: 4,
      phase: "racing",
      roundCountdown: 0,
      winner: null
    });

    // Spawn Car 1 (Leader, inside viewport)
    const car1 = spawnBlueprint(world, "car", { x: 400, y: 300 });
    world.addComponent(car1, { type: "LocalPlayer" });

    // Spawn Car 2 (Trailing, far outside viewport)
    const car2 = spawnBlueprint(world, "car", { x: -1000, y: 300 });

    world.update(1 / 60);

    const state = world.getComponent(h2hEntity, "HeadToHeadState");
    expect(state?.phase).toBe("round_end");
    expect(state?.scores.player_1).toBe(1);
  });
});
