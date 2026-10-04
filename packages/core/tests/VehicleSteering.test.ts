import { World } from "../src/ecs/World";
import { CoreComponentRegistry } from "../src/ecs/CoreComponents";
import {
  VehicleSteeringSystem,
  createVehicleSteering,
} from "../src";

describe("VehicleSteering Physics Tests", () => {
  let world: World<CoreComponentRegistry>;
  let steeringSystem: VehicleSteeringSystem;

  beforeEach(() => {
    world = new World<CoreComponentRegistry>();
    steeringSystem = new VehicleSteeringSystem();
    world.addSystem(steeringSystem);
  });

  it("should accelerate forward along heading vector and enforce max speed cap", () => {
    const vehicleEntity = world.createEntity();
    world.addComponent(vehicleEntity, {
      type: "Transform",
      x: 0,
      y: 0,
      rotation: 0, // facing East / +X axis
      scaleX: 1,
      scaleY: 1,
      worldX: 0,
      worldY: 0,
      worldRotation: 0,
      worldScaleX: 1,
      worldScaleY: 1,
      dirty: false,
    });
    world.addComponent(vehicleEntity, {
      type: "Velocity",
      vx: 0,
      vy: 0,
      angularVelocity: 0,
    });
    world.addComponent(
      vehicleEntity,
      createVehicleSteering({
        acceleration: 100,
        maxSpeed: 150,
        steeringRate: Math.PI,
        traction: 0.9,
        driftFactor: 0.1,
      })
    );

    // Apply throttle = 1.0 (full forward)
    world.mutateComponent(vehicleEntity, "VehicleSteering", (v) => {
      v.throttle = 1.0;
    });

    // Update 1s
    steeringSystem.update(world, 1.0);

    const vel1 = world.getComponent(vehicleEntity, "Velocity")!;
    expect(vel1.vx).toBeCloseTo(100);
    expect(vel1.vy).toBeCloseTo(0);

    // Update another 1s -> acceleration should cap at maxSpeed (150)
    steeringSystem.update(world, 1.0);
    const vel2 = world.getComponent(vehicleEntity, "Velocity")!;
    expect(vel2.vx).toBeCloseTo(150);
    expect(vel2.vy).toBeCloseTo(0);
  });

  it("should rotate transform orientation when steering input is applied", () => {
    const vehicleEntity = world.createEntity();
    world.addComponent(vehicleEntity, {
      type: "Transform",
      x: 0,
      y: 0,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      worldX: 0,
      worldY: 0,
      worldRotation: 0,
      worldScaleX: 1,
      worldScaleY: 1,
      dirty: false,
    });
    world.addComponent(vehicleEntity, {
      type: "Velocity",
      vx: 0,
      vy: 0,
      angularVelocity: 0,
    });
    world.addComponent(
      vehicleEntity,
      createVehicleSteering({
        acceleration: 100,
        maxSpeed: 200,
        steeringRate: Math.PI / 2, // 90 deg/s
        traction: 0.9,
        driftFactor: 0.1,
      })
    );

    // Apply right steering (1.0)
    world.mutateComponent(vehicleEntity, "VehicleSteering", (v) => {
      v.steering = 1.0;
    });

    steeringSystem.update(world, 1.0);

    const trans = world.getComponent(vehicleEntity, "Transform")!;
    expect(trans.rotation).toBeCloseTo(Math.PI / 2);
  });

  it("should damp lateral velocity according to traction and drift factor", () => {
    // High traction vehicle
    const highTractionEntity = world.createEntity();
    world.addComponent(highTractionEntity, {
      type: "Transform",
      x: 0,
      y: 0,
      rotation: 0, // facing East (+X)
      scaleX: 1,
      scaleY: 1,
      worldX: 0,
      worldY: 0,
      worldRotation: 0,
      worldScaleX: 1,
      worldScaleY: 1,
      dirty: false,
    });
    // Entity moving purely sideways (y velocity = 100)
    world.addComponent(highTractionEntity, {
      type: "Velocity",
      vx: 0,
      vy: 100,
      angularVelocity: 0,
    });
    world.addComponent(
      highTractionEntity,
      createVehicleSteering({
        acceleration: 0,
        maxSpeed: 500,
        steeringRate: 0,
        traction: 0.9, // high grip
        driftFactor: 0.1, // low drift
      })
    );

    // Low traction vehicle (ice)
    const lowTractionEntity = world.createEntity();
    world.addComponent(lowTractionEntity, {
      type: "Transform",
      x: 0,
      y: 0,
      rotation: 0,
      scaleX: 1,
      scaleY: 1,
      worldX: 0,
      worldY: 0,
      worldRotation: 0,
      worldScaleX: 1,
      worldScaleY: 1,
      dirty: false,
    });
    world.addComponent(lowTractionEntity, {
      type: "Velocity",
      vx: 0,
      vy: 100,
      angularVelocity: 0,
    });
    world.addComponent(
      lowTractionEntity,
      createVehicleSteering({
        acceleration: 0,
        maxSpeed: 500,
        steeringRate: 0,
        traction: 0.1, // slippery ice
        driftFactor: 0.9, // high drift
      })
    );

    steeringSystem.update(world, 0.5);

    const velHigh = world.getComponent(highTractionEntity, "Velocity")!;
    const velLow = world.getComponent(lowTractionEntity, "Velocity")!;

    // High traction vehicle should damp lateral velocity vy significantly faster than low traction
    expect(Math.abs(velHigh.vy)).toBeLessThan(Math.abs(velLow.vy));
  });
});
