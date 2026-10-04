import { World } from "../../../ecs/World";
import { SystemPhase } from "../../../ecs/System";
import { createVehicleSteering } from "../VehicleSteeringComponent";
import { createVehicleWaypoint } from "../VehicleWaypointComponent";
import { VehicleWaypointSystem } from "../VehicleWaypointSystem";
import { VehicleSteeringSystem } from "../VehicleSteeringSystem";
import { EntityBuilder } from "../../../ecs/EntityBuilder";

describe("VehicleWaypointSystem", () => {
  it("steers AI vehicle toward target waypoints and advances index upon arrival", () => {
    const world = new World();
    const waypointSystem = new VehicleWaypointSystem();
    const steeringSystem = new VehicleSteeringSystem();

    world.addSystem(waypointSystem, { phase: SystemPhase.Simulation });
    world.addSystem(steeringSystem, { phase: SystemPhase.Simulation });

    const waypoints = [
      { x: 200, y: 100 },
      { x: 200, y: 300 }
    ];

    const car = EntityBuilder.create(world)
      .withTransform({ x: 100, y: 100, rotation: 0 })
      .withVelocity({ vx: 0, vy: 0 })
      .build();

    world.addComponent(car, createVehicleSteering({ acceleration: 300, maxSpeed: 400, steeringRate: Math.PI, traction: 0.8, driftFactor: 0.3 }));
    world.addComponent(car, createVehicleWaypoint(waypoints, 50, true));

    // Update 1 frame
    world.update(1 / 60);

    const vehicle = world.getComponent(car, "VehicleSteering")!;
    // Waypoint is to the right (+X), car faces right (rotation 0), so throttle should be positive
    expect(vehicle.throttle).toBeGreaterThan(0);

    // Teleport car close to 1st waypoint (within targetRadius 50)
    world.mutateComponent(car, "Transform", (t) => {
      t.x = 195;
      t.y = 100;
    });

    world.update(1 / 60);

    const wp = world.getComponent(car, "VehicleWaypoint")!;
    // Waypoint index should advance to 1 (target { x: 200, y: 300 })
    expect(wp.currentWaypointIndex).toBe(1);
  });
});
