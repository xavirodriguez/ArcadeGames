import { World } from "../src/ecs/World";
import { EventBus } from "../src/events/EventBus";
import { GameLoop } from "../src/loop/GameLoop";
import { System } from "../src/ecs/System";
import { DebugManager } from "../src/ui/debug/DebugManager";
import { SystemPhase } from "../src/ecs/System";

describe("DebugManager Unit Tests", () => {
  let world: World;
  let eventBus: EventBus;
  let gameLoop: GameLoop;
  let debugManager: DebugManager;

  beforeEach(() => {
    world = new World();
    eventBus = new EventBus();
    gameLoop = new GameLoop();
    debugManager = new DebugManager(world, eventBus, gameLoop);
  });

  afterEach(() => {
    debugManager.dispose();
  });

  describe("getSystemTimings()", () => {
    it("should measure and record execution times of systems in the record", () => {
      class TestFastSystem extends System {
        update(w: World, dt: number): void {
          // busy wait for 1-2 milliseconds to ensure a positive duration is recorded
          const start = performance.now();
          while (performance.now() - start < 2) {
            // busy loop
          }
        }
      }

      const system = new TestFastSystem();
      world.addSystem(system, { phase: SystemPhase.Simulation });

      world.update(1 / 60);

      const timings = debugManager.getSystemTimings();
      expect(timings["TestFastSystem"]).toBeDefined();
      expect(timings["TestFastSystem"]).toBeGreaterThan(0);
    });

    it("should propagate exceptions correctly when a system throws an error", () => {
      class ErrorThrowingSystem extends System {
        update(w: World, dt: number): void {
          throw new Error("Deliberate simulation error");
        }
      }

      const system = new ErrorThrowingSystem();
      world.addSystem(system, { phase: SystemPhase.Simulation });

      expect(() => {
        world.update(1 / 60);
      }).toThrow("Deliberate simulation error");

      // Verify that timing was recorded even if it threw an error
      const timings = debugManager.getSystemTimings();
      expect(timings["ErrorThrowingSystem"]).toBeDefined();
    });
  });

  describe("Event Log Tracking", () => {
    it("should capture events emitted by the EventBus in getEventLog()", () => {
      eventBus.emit("custom_event" as any, { foo: "bar" });
      eventBus.emit("another_event" as any, 42);

      const log = debugManager.getEventLog();
      expect(log.length).toBe(2);

      expect(log[0].event).toBe("custom_event");
      expect(log[0].payload).toEqual({ foo: "bar" });
      expect(log[0].timestamp).toBeGreaterThan(0);

      expect(log[1].event).toBe("another_event");
      expect(log[1].payload).toBe(42);
    });

    it("should respect the circular buffer limit of 200 events", () => {
      for (let i = 0; i < 210; i++) {
        eventBus.emit("event" as any, i);
      }

      const log = debugManager.getEventLog();
      expect(log.length).toBe(200);

      // It should keep the latest 200 events (from index 10 to 209)
      expect(log[0].payload).toBe(10);
      expect(log[199].payload).toBe(209);
    });

    it("should purge the event buffer on clearEventLog()", () => {
      eventBus.emit("some_event" as any, "data");
      expect(debugManager.getEventLog().length).toBe(1);

      debugManager.clearEventLog();
      expect(debugManager.getEventLog().length).toBe(0);
    });
  });
});
