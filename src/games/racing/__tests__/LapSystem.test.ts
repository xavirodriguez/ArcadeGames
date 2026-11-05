import { World, SystemPhase } from "@tiny-aster/core";
import { LapSystem } from "../systems/LapSystem";
import type { RacingComponentRegistry, RacingEventRegistry } from "../types/RacingRegistry";
import type { RacingConfig } from "../types/RacingConfigSchema";

const config = {
  TOTAL_LAPS: 3,
  COUNTDOWN_SECONDS: 3
} as RacingConfig;

function makeTransform(x: number, y: number) {
  return {
    type: "Transform" as const,
    x,
    y,
    rotation: 0,
    scaleX: 1,
    scaleY: 1,
    worldX: x,
    worldY: y,
    worldRotation: 0,
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

describe("LapSystem", () => {
  function setupWorld() {
    const world = new World<RacingComponentRegistry, RacingEventRegistry>();
    world.addSystem(new LapSystem(config), { phase: SystemPhase.GameRules });

    const stateEntity = world.createEntity();
    world.addComponent(stateEntity, {
      type: "RacingState",
      phase: "racing" as const,
      countdownRemaining: 0,
      currentLap: 1,
      totalLaps: 3,
      lastLapTime: 0,
      bestLapTime: null,
      raceTime: 10,
      isGameOver: false,
      position: 1
    });

    // 3 checkpoints at x=0,100,200
    for (let i = 0; i < 3; i += 1) {
      const cp = world.createEntity();
      world.addComponent(cp, {
        type: "Checkpoint",
        index: i,
        width: 40,
        height: 40,
        isFinish: i === 0
      });
      world.addComponent(cp, makeTransform(i * 100, 0));
    }

    return world;
  }

  it("advances two cars independently", () => {
    const world = setupWorld();

    const carA = world.createEntity();
    world.addComponent(carA, {
      type: "Car",
      acceleration: 1,
      maxSpeed: 1,
      grip: 1,
      drift: 0,
      turnRate: 1,
      boostMultiplier: 1,
      boostRemaining: 0
    });
    world.addComponent(carA, { type: "LocalPlayer" });
    world.addComponent(carA, makeTransform(0, 0));
    world.addComponent(carA, makeLap(1, -1));

    const carB = world.createEntity();
    world.addComponent(carB, {
      type: "Car",
      acceleration: 1,
      maxSpeed: 1,
      grip: 1,
      drift: 0,
      turnRate: 1,
      boostMultiplier: 1,
      boostRemaining: 0
    });
    world.addComponent(carB, makeTransform(100, 0)); // already at cp 1
    world.addComponent(carB, makeLap(1, -1));

    world.update(1 / 60);

    const lapA = world.getComponent(carA, "Lap");
    const lapB = world.getComponent(carB, "Lap");
    expect(lapA?.lastCheckpoint).toBe(0);
    expect(lapB?.lastCheckpoint).toBe(1);
  });

  it("lets AI complete a lap without emitting race:finished", () => {
    const world = setupWorld();
    const events: string[] = [];
    const bus = world.getEventBus();
    const orig = bus.emitDeferred.bind(bus);
    bus.emitDeferred = ((name: string, payload: unknown) => {
      events.push(name);
      return orig(name, payload);
    }) as typeof bus.emitDeferred;

    const ai = world.createEntity();
    world.addComponent(ai, {
      type: "Car",
      acceleration: 1,
      maxSpeed: 1,
      grip: 1,
      drift: 0,
      turnRate: 1,
      boostMultiplier: 1,
      boostRemaining: 0
    });
    // At finish line, lastCheckpoint = last index so wrap triggers
    world.addComponent(ai, makeTransform(0, 0));
    world.addComponent(ai, makeLap(1, 2)); // last of 3 checkpoints

    world.update(1 / 60);

    const lap = world.getComponent(ai, "Lap");
    expect(lap?.currentLap).toBe(2);
    expect(lap?.lastCheckpoint).toBe(0);
    expect(events).not.toContain("lap:completed");
    expect(events).not.toContain("race:finished");
  });

  it("emits lap:completed and race:finished only for LocalPlayer", () => {
    const world = setupWorld();
    const events: string[] = [];
    const bus = world.getEventBus();
    const orig = bus.emitDeferred.bind(bus);
    bus.emitDeferred = ((name: string, payload: unknown) => {
      events.push(name);
      return orig(name, payload);
    }) as typeof bus.emitDeferred;

    const human = world.createEntity();
    world.addComponent(human, {
      type: "Car",
      acceleration: 1,
      maxSpeed: 1,
      grip: 1,
      drift: 0,
      turnRate: 1,
      boostMultiplier: 1,
      boostRemaining: 0
    });
    world.addComponent(human, { type: "LocalPlayer" });
    world.addComponent(human, makeTransform(0, 0));
    world.addComponent(human, makeLap(3, 2)); // about to finish last lap

    world.update(1 / 60);

    expect(events).toContain("lap:completed");
    expect(events).toContain("race:finished");
  });

  it("does not count checkpoints during non-racing phases", () => {
    const world = setupWorld();
    const state = world.getSingleton("RacingState");
    if (state) state.phase = "countdown";

    const car = world.createEntity();
    world.addComponent(car, {
      type: "Car",
      acceleration: 1,
      maxSpeed: 1,
      grip: 1,
      drift: 0,
      turnRate: 1,
      boostMultiplier: 1,
      boostRemaining: 0
    });
    world.addComponent(car, { type: "LocalPlayer" });
    world.addComponent(car, makeTransform(0, 0));
    world.addComponent(car, makeLap(1, -1));

    world.update(1 / 60);
    expect(world.getComponent(car, "Lap")?.lastCheckpoint).toBe(-1);
  });

  it("stops AI progress after completing all laps", () => {
    const world = setupWorld();

    const ai = world.createEntity();
    world.addComponent(ai, {
      type: "Car",
      acceleration: 1,
      maxSpeed: 1,
      grip: 1,
      drift: 0,
      turnRate: 1,
      boostMultiplier: 1,
      boostRemaining: 0
    });
    world.addComponent(ai, makeTransform(0, 0));
    // currentLap already > TOTAL_LAPS
    world.addComponent(ai, makeLap(4, 0));

    world.update(1 / 60);
    const lap = world.getComponent(ai, "Lap");
    expect(lap?.currentLap).toBe(4);
    expect(lap?.lastCheckpoint).toBe(0);
  });
});
