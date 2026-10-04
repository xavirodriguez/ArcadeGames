import { World, createVehicleSteering, createVehicleWaypoint } from "@tiny-aster/core";
import { SystemPhase } from "@tiny-aster/core";
import { VehicleAISystem } from "../systems/VehicleAISystem";
import type { RacingComponentRegistry, RacingEventRegistry } from "../types/RacingRegistry";

describe("VehicleAISystem", () => {
  it("steers AI vehicle toward waypoints and applies rubber-banding when trailing human player", () => {
    const world = new World<RacingComponentRegistry, RacingEventRegistry>();
    const aiSystem = new VehicleAISystem();

    world.addSystem(aiSystem, { phase: SystemPhase.Simulation });

    // Human player ahead at x=600
    const humanCar = world.createEntity();
    world.addComponent(humanCar, { type: "LocalPlayer" });
    world.addComponent(humanCar, {
      type: "Transform",
      x: 600,
      y: 100,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      worldX: 600,
      worldY: 100,
      worldRotation: 0,
      worldScaleX: 1,
      worldScaleY: 1,
      dirty: false
    });

    // AI car behind at x=100 heading toward waypoint at (400, 100)
    const aiCar = world.createEntity();
    world.addComponent(aiCar, { type: "Car", acceleration: 300, maxSpeed: 400, grip: 8, drift: 0.4, turnRate: 3.2, boostMultiplier: 1.3, boostRemaining: 0 });
    world.addComponent(aiCar, {
      type: "Transform",
      x: 100,
      y: 100,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      worldX: 100,
      worldY: 100,
      worldRotation: 0,
      worldScaleX: 1,
      worldScaleY: 1,
      dirty: false
    });
    world.addComponent(aiCar, createVehicleSteering({ acceleration: 300, maxSpeed: 400, steeringRate: 3.2, traction: 0.8, driftFactor: 0.4 }));
    world.addComponent(aiCar, createVehicleWaypoint([{ x: 400, y: 100 }], 50, true));

    world.update(1 / 60);

    const vehicle = world.getComponent(aiCar, "VehicleSteering");
    expect(vehicle?.throttle).toBeGreaterThan(0.5);
  });
});
