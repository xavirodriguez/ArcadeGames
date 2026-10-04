import { World, CoreComponentRegistry, EventBus } from "@tiny-aster/core";
import {
  CaptureSystem,
  createCapturable,
  PathPatternsSystem,
  createPathPattern,
  LapTimerSystem,
  createLapTracker,
} from "../index";

describe("Shared Gameplay Patterns Tests (Phase 6)", () => {
  let world: World<CoreComponentRegistry>;
  let eventBus: EventBus;

  beforeEach(() => {
    world = new World<CoreComponentRegistry>();
    eventBus = new EventBus();
    world.setResource("EventBus", eventBus);
  });

  describe("CaptureSystem", () => {
    it("should manage capture lifecycle transitions and emit events", () => {
      const captureSystem = new CaptureSystem();
      world.addSystem(captureSystem);

      const target = world.createEntity();
      world.addComponent(target, {
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
        dirty: false,
      });
      world.addComponent(target, { type: "Velocity", vx: 50, vy: 0, angularVelocity: 0 });
      world.addComponent(target, createCapturable({ maxDuration: 2.0, floatVelocityY: -40 }));

      let trappedEvent: any = null;
      let escapedEvent: any = null;
      let poppedEvent: any = null;

      eventBus.on("capture:trapped" as any, (p) => (trappedEvent = p));
      eventBus.on("capture:escaped" as any, (p) => (escapedEvent = p));
      eventBus.on("capture:popped" as any, (p) => (poppedEvent = p));

      const captor = world.createEntity();

      // Trap target
      const trapped = CaptureSystem.trap(world, target, captor);
      expect(trapped).toBe(true);
      expect(trappedEvent).toEqual({ entity: target, captorEntity: captor });

      // Update 1s -> float velocity applied, elapsed = 1s
      captureSystem.update(world, 1.0);
      const vel = world.getComponent(target, "Velocity")!;
      expect(vel.vx).toBe(0);
      expect(vel.vy).toBe(-40);

      // Update 1.5s -> elapsed = 2.5s >= maxDuration 2.0s -> escaped!
      captureSystem.update(world, 1.5);
      const capturable = world.getComponent(target, "Capturable" as any) as any;
      expect(capturable.state).toBe("escaped");
      expect(escapedEvent).toEqual({ entity: target, captorEntity: captor });

      // Re-trap and Pop
      CaptureSystem.trap(world, target, captor);
      const popped = CaptureSystem.pop(world, target, 999);
      expect(popped).toBe(true);
      expect(poppedEvent).toEqual({ entity: target, captorEntity: captor, popSourceEntity: 999 });
    });
  });

  describe("PathPatternsSystem", () => {
    it("should update position for sine pattern", () => {
      const system = new PathPatternsSystem();
      world.addSystem(system);

      const entity = world.createEntity();
      world.addComponent(entity, {
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
      world.addComponent(
        entity,
        createPathPattern({
          pattern: "sine",
          originX: 100,
          originY: 200,
          speed: 50,
          frequency: 1.0,
          amplitude: 30,
        })
      );

      system.update(world, 0.25); // 1/4 period -> sin(2pi * 0.25) = sin(pi/2) = 1.0
      const trans = world.getComponent(entity, "Transform")!;
      expect(trans.x).toBeCloseTo(100 + 0.25 * 50); // 112.5
      expect(trans.y).toBeCloseTo(200 + 30); // 230
    });

    it("should update position along waypoint sequence", () => {
      const system = new PathPatternsSystem();
      world.addSystem(system);

      const entity = world.createEntity();
      world.addComponent(entity, {
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
      world.addComponent(
        entity,
        createPathPattern({
          pattern: "waypoints",
          originX: 0,
          originY: 0,
          speed: 100,
          waypoints: [
            { x: 100, y: 0 },
            { x: 100, y: 100 },
          ],
        })
      );

      // 0.5s at 100 speed -> moves 50px towards (100, 0)
      system.update(world, 0.5);
      const trans1 = world.getComponent(entity, "Transform")!;
      expect(trans1.x).toBeCloseTo(50);
      expect(trans1.y).toBeCloseTo(0);

      // Another 0.6s -> reaches (100, 0) and advances to next waypoint (100, 100)
      system.update(world, 0.6);
      const trans2 = world.getComponent(entity, "Transform")!;
      expect(trans2.x).toBeCloseTo(100);
      expect(trans2.y).toBeCloseTo(0);

      const pattern = world.getComponent(entity, "PathPattern" as any) as any;
      expect(pattern.currentWaypointIndex).toBe(1);
    });
  });

  describe("LapTimerSystem", () => {
    it("should validate sequential checkpoints and complete laps/race", () => {
      const lapSystem = new LapTimerSystem();
      world.addSystem(lapSystem);

      const racer = world.createEntity();
      world.addComponent(racer, createLapTracker({ totalLaps: 2, totalCheckpoints: 2 }));

      let completedLaps: any[] = [];
      let raceFinished: any = null;

      eventBus.on("lap:completed" as any, (p) => completedLaps.push(p));
      eventBus.on("race:finished" as any, (p) => (raceFinished = p));

      // Advance time 10s
      lapSystem.update(world, 10.0);

      // Wrong checkpoint (1 instead of 0) -> rejected
      expect(LapTimerSystem.passCheckpoint(world, racer, 1)).toBe(false);

      // Checkpoint 0 -> accepted
      expect(LapTimerSystem.passCheckpoint(world, racer, 0)).toBe(true);

      // Checkpoint 1 -> accepted, wraps to 0 completing Lap 1!
      expect(LapTimerSystem.passCheckpoint(world, racer, 1)).toBe(true);

      expect(completedLaps.length).toBe(1);
      expect(completedLaps[0].lap).toBe(1);
      expect(completedLaps[0].lapTime).toBeCloseTo(10.0);
      expect(completedLaps[0].isNewBest).toBe(true);

      // Lap 2: Advance time 8s
      lapSystem.update(world, 8.0);

      LapTimerSystem.passCheckpoint(world, racer, 0);
      LapTimerSystem.passCheckpoint(world, racer, 1); // Lap 2 complete!

      expect(completedLaps.length).toBe(2);
      expect(completedLaps[1].lap).toBe(2);
      expect(completedLaps[1].lapTime).toBeCloseTo(8.0);
      expect(completedLaps[1].isNewBest).toBe(true);

      expect(raceFinished).not.toBeNull();
      expect(raceFinished.totalRaceTime).toBeCloseTo(18.0);
      expect(raceFinished.bestLapTime).toBeCloseTo(8.0);
    });
  });
});
