import { World, SystemPhase, BlueprintRegistry } from "@tiny-aster/core";
import { RacingSurfaceSystem } from "../systems/RacingSurfaceSystem";
import { RacingConfigSchema } from "../types/RacingConfigSchema";
import { registerRacingBlueprints, spawnBlueprint } from "../EntityFactory";
import racingConfigRaw from "../config/racing.json";
import type { RacingComponentRegistry, RacingEventRegistry, RacingBlueprintMap } from "../types/RacingRegistry";
import type { TrackSpec } from "../types/TrackSpecSchema";

describe("RacingSurfaceSystem", () => {
  it("modifies vehicle grip and velocity based on track surface zones", () => {
    const world = new World<RacingComponentRegistry, RacingEventRegistry, RacingBlueprintMap>();
    const registry = new BlueprintRegistry<RacingComponentRegistry, RacingEventRegistry>();
    world.setResource("BlueprintRegistry", registry as never);
    registerRacingBlueprints(world, registry as never);

    const config = RacingConfigSchema.parse(racingConfigRaw);

    const trackSpec: TrackSpec = {
      id: "test_track",
      name: "Test Track",
      theme: "breakfast",
      width: 1600,
      height: 1000,
      spawnPoints: [{ x: 500, y: 500, rotation: 0 }],
      waypoints: [],
      walls: [],
      zones: [
        {
          id: "oil_slick",
          x: 500,
          y: 500,
          width: 200,
          height: 200,
          surface: "oil",
          gripModifier: 0.2,
          speedModifier: 0.9
        }
      ],
      obstacles: []
    };

    world.setResource("ActiveTrackSpec", trackSpec);

    const car = spawnBlueprint(world, "car", { x: 500, y: 500 });
    const vel = world.getMutableComponent(car, "Velocity")!;
    vel.vx = 100;
    vel.vy = 0;

    const system = new RacingSurfaceSystem(config);
    world.addSystem(system, { phase: SystemPhase.Simulation });

    world.update(0.016);

    const carComp = world.getComponent(car, "Car")!;
    expect(carComp.grip).toBeLessThan(config.CAR_GRIP);
    expect(vel.vx).toBeLessThan(100);
  });
});
