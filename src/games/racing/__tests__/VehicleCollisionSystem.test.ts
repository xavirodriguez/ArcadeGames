import { World, SystemPhase, BlueprintRegistry } from "@tiny-aster/core";
import { VehicleCollisionSystem } from "../systems/VehicleCollisionSystem";
import { registerRacingBlueprints, spawnBlueprint } from "../EntityFactory";
import type { RacingComponentRegistry, RacingEventRegistry, RacingBlueprintMap } from "../types/RacingRegistry";

describe("VehicleCollisionSystem", () => {
  it("resolves overlap and transfers impulse between colliding vehicles", () => {
    const world = new World<RacingComponentRegistry, RacingEventRegistry, RacingBlueprintMap>();
    const registry = new BlueprintRegistry<RacingComponentRegistry, RacingEventRegistry>();
    world.setResource("BlueprintRegistry", registry as never);
    registerRacingBlueprints(world, registry as never);

    const carA = spawnBlueprint(world, "car", { x: 100, y: 100 });
    const carB = spawnBlueprint(world, "car", { x: 120, y: 100 }); // Overlapping radii

    const velA = world.getMutableComponent(carA, "Velocity")!;
    const velB = world.getMutableComponent(carB, "Velocity")!;

    velA.vx = 100;
    velB.vx = -100;

    const system = new VehicleCollisionSystem();
    world.addSystem(system, { phase: SystemPhase.Simulation });

    world.update(0.016);

    const transA = world.getComponent(carA, "Transform")!;
    const transB = world.getComponent(carB, "Transform")!;

    // Vehicles should be pushed apart
    expect(transA.x).toBeLessThan(100);
    expect(transB.x).toBeGreaterThan(120);

    // Velocities should reflect bounce impulse
    expect(velA.vx).toBeLessThan(100);
    expect(velB.vx).toBeGreaterThan(-100);
  });
});
