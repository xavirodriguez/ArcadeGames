import { World, createVehicleSteering, createVehicleWaypoint, SystemPhase } from "@tiny-aster/core";
import { VehicleAISystem } from "../systems/VehicleAISystem";
import { createAIPersonality } from "../aiPersonality";
import type { RacingComponentRegistry, RacingEventRegistry } from "../types/RacingRegistry";

function makeTransform(x: number, y: number, rotation = 0) {
  return {
    type: "Transform" as const,
    x,
    y,
    rotation,
    scaleX: 1,
    scaleY: 1,
    worldX: x,
    worldY: y,
    worldRotation: rotation,
    worldScaleX: 1,
    worldScaleY: 1,
    dirty: false
  };
}

function makeLap(currentLap = 1, lastCheckpoint = -1) {
  return {
    type: "Lap" as const,
    currentLap,
    lastCheckpoint,
    lapStartedAt: 0,
    lastLapTime: 0,
    bestLapTime: null as number | null
  };
}

describe("VehicleAISystem", () => {
  it("steers AI vehicle toward waypoints and applies rubber-banding when trailing", () => {
    const world = new World<RacingComponentRegistry, RacingEventRegistry>();
    const aiSystem = new VehicleAISystem();
    world.addSystem(aiSystem, { phase: SystemPhase.Simulation });

    // Human ahead in progress (checkpoint 2)
    const humanCar = world.createEntity();
    world.addComponent(humanCar, { type: "LocalPlayer" });
    world.addComponent(humanCar, makeTransform(600, 100));
    world.addComponent(humanCar, makeLap(1, 2));
    world.addComponent(humanCar, {
      type: "Car",
      acceleration: 300,
      maxSpeed: 400,
      grip: 8,
      drift: 0.4,
      turnRate: 3.2,
      boostMultiplier: 1.3,
      boostRemaining: 0
    });

    // AI behind (checkpoint -1)
    const aiCar = world.createEntity();
    world.addComponent(aiCar, {
      type: "Car",
      acceleration: 300,
      maxSpeed: 400,
      grip: 8,
      drift: 0.4,
      turnRate: 3.2,
      boostMultiplier: 1.3,
      boostRemaining: 0
    });
    world.addComponent(aiCar, makeTransform(100, 100));
    world.addComponent(aiCar, makeLap(1, -1));
    world.addComponent(aiCar, createVehicleSteering({
      acceleration: 300,
      maxSpeed: 400,
      steeringRate: 3.2,
      traction: 0.8,
      driftFactor: 0.4
    }));
    world.addComponent(aiCar, createVehicleWaypoint([{ x: 400, y: 100 }], 50, true));
    world.addComponent(aiCar, createAIPersonality("normal"));

    // Minimal checkpoints so progress is defined
    for (let i = 0; i < 4; i += 1) {
      const cp = world.createEntity();
      world.addComponent(cp, {
        type: "Checkpoint",
        index: i,
        width: 40,
        height: 40,
        isFinish: i === 0
      });
      world.addComponent(cp, makeTransform(i * 100, 100));
    }

    world.update(1 / 60);

    const vehicle = world.getComponent(aiCar, "VehicleSteering");
    expect(vehicle?.throttle).toBeGreaterThan(0.5);
  });

  it("does not boost when throttle is negative (reverse)", () => {
    const world = new World<RacingComponentRegistry, RacingEventRegistry>();
    const aiSystem = new VehicleAISystem();
    world.addSystem(aiSystem, { phase: SystemPhase.Simulation });

    const humanCar = world.createEntity();
    world.addComponent(humanCar, { type: "LocalPlayer" });
    world.addComponent(humanCar, makeTransform(800, 100));
    world.addComponent(humanCar, makeLap(1, 3));
    world.addComponent(humanCar, {
      type: "Car",
      acceleration: 300,
      maxSpeed: 400,
      grip: 8,
      drift: 0.4,
      turnRate: 3.2,
      boostMultiplier: 1.3,
      boostRemaining: 0
    });

    // AI facing opposite direction so alignment produces negative throttle
    const aiCar = world.createEntity();
    world.addComponent(aiCar, {
      type: "Car",
      acceleration: 300,
      maxSpeed: 400,
      grip: 8,
      drift: 0.4,
      turnRate: 3.2,
      boostMultiplier: 1.3,
      boostRemaining: 0
    });
    world.addComponent(aiCar, makeTransform(100, 100, Math.PI)); // facing away
    world.addComponent(aiCar, makeLap(1, -1));
    world.addComponent(aiCar, createVehicleSteering({
      acceleration: 300,
      maxSpeed: 400,
      steeringRate: 3.2,
      traction: 0.8,
      driftFactor: 0.4
    }));
    world.addComponent(aiCar, createVehicleWaypoint([{ x: 400, y: 100 }], 50, true));
    world.addComponent(aiCar, createAIPersonality("hard")); // strong boost multiplier

    for (let i = 0; i < 4; i += 1) {
      const cp = world.createEntity();
      world.addComponent(cp, {
        type: "Checkpoint",
        index: i,
        width: 40,
        height: 40,
        isFinish: i === 0
      });
      world.addComponent(cp, makeTransform(i * 100, 100));
    }

    world.update(1 / 60);

    const vehicle = world.getComponent(aiCar, "VehicleSteering");
    // When reverse, throttle must stay <= 0 (no boost amplification)
    expect(vehicle?.throttle).toBeLessThanOrEqual(0);
  });

  it("respects pause and HeadToHead phase guards", () => {
    const world = new World<RacingComponentRegistry, RacingEventRegistry>();
    const aiSystem = new VehicleAISystem();
    world.addSystem(aiSystem, { phase: SystemPhase.Simulation });

    const aiCar = world.createEntity();
    world.addComponent(aiCar, {
      type: "Car",
      acceleration: 300,
      maxSpeed: 400,
      grip: 8,
      drift: 0.4,
      turnRate: 3.2,
      boostMultiplier: 1.3,
      boostRemaining: 0
    });
    world.addComponent(aiCar, makeTransform(100, 100));
    world.addComponent(aiCar, makeLap());
    world.addComponent(aiCar, createVehicleSteering({
      acceleration: 300,
      maxSpeed: 400,
      steeringRate: 3.2,
      traction: 0.8,
      driftFactor: 0.4
    }));
    world.addComponent(aiCar, createVehicleWaypoint([{ x: 400, y: 100 }], 50, true));
    world.addComponent(aiCar, createAIPersonality("normal"));

    world.setResource("IsPaused", true);
    world.update(1 / 60);
    const vehiclePaused = world.getComponent(aiCar, "VehicleSteering");
    // throttle should remain at whatever the component was created with (0)
    expect(vehiclePaused?.throttle).toBe(0);

    world.setResource("IsPaused", false);
    const h2h = world.createEntity();
    world.addComponent(h2h, {
      type: "HeadToHeadState",
      leaderEntity: null,
      scores: {},
      targetScore: 4,
      phase: "countdown" as const,
      roundCountdown: 2,
      winner: null
    });
    world.update(1 / 60);
    const vehicleH2H = world.getComponent(aiCar, "VehicleSteering");
    expect(vehicleH2H?.throttle).toBe(0);
  });

  it("applies different personalities", () => {
    const easy = createAIPersonality("easy");
    const hard = createAIPersonality("hard");
    expect(easy.aggression).toBeLessThan(hard.aggression);
    expect(easy.noiseAmplitude).toBeGreaterThan(hard.noiseAmplitude);
    expect(easy.boostMultiplier).toBeLessThan(hard.boostMultiplier);
    expect(easy.nerfMultiplier).toBeGreaterThan(hard.nerfMultiplier);
  });
});
