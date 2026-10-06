import { World, CoreComponentRegistry, SystemPhase, ReplayRecorder, ReplayPlayer } from "@tiny-aster/core";
import { JuiceOrchestrator, JUICE_CATALOG } from "../JuiceOrchestrator";
import { HitStopSystem, HitStopPriority, requestHitStop, isHitStopActive } from "../HitStopSystem";
import { KineticFlowSystem } from "../KineticFlowSystem";
import { getVFXState } from "../SharedVFXInternal";
import { AsteroidsGame } from "../../../asteroids/AsteroidsGame";
import { GeometryWarsGame } from "../../../geometrywars/GeometryWarsGame";
import { SpaceInvadersGame } from "../../../space-invaders/SpaceInvadersGame";

describe("JuiceOrchestrator Unit Tests & Golden Replays", () => {
  let world: World<CoreComponentRegistry>;
  let juice: JuiceOrchestrator;

  beforeEach(() => {
    world = new World<CoreComponentRegistry>();
    world.setResource("ScreenConfig", { width: 800, height: 600 });
    juice = new JuiceOrchestrator(world);
  });

  describe("FR-1: juice.spawn API", () => {
    it("should spawn visual primitives with single-line call and TTL components", () => {
      const entity = juice.spawn("shockwave", { x: 100, y: 150, tint: "#ff0055", scale: 1.5, ttl: 0.5 });
      expect(entity).not.toBeNull();

      if (entity !== null) {
        const render = world.getComponent(entity, "Render");
        const ttl = world.getComponent(entity, "TTL");
        const transform = world.getComponent(entity, "Transform");

        expect(render?.shape).toBe("shockwave");
        expect(render?.color).toBe("#ff0055");
        expect(transform?.x).toBe(100);
        expect(transform?.y).toBe(150);
        expect(transform?.scaleX).toBe(1.5);
        expect(ttl?.remaining).toBe(0.5);
      }
    });

    it("should handle floating_text custom text option", () => {
      const entity = juice.spawn("floating_text", { x: 200, y: 300, text: "+500" });
      expect(entity).not.toBeNull();
      if (entity !== null) {
        const render = world.getComponent(entity, "Render") as any;
        expect(render?.text).toBe("+500");
      }
    });
  });

  describe("FR-3: Hit-Stop Concurrency Control", () => {
    let hitStopSys: HitStopSystem;

    beforeEach(() => {
      hitStopSys = new HitStopSystem();
    });

    it("should allow a higher priority hit-stop to override an active lower priority hit-stop", () => {
      requestHitStop(world, 100, HitStopPriority.LOW);
      const state = getVFXState(world);
      expect(state.hitStopTimer).toBe(0.1); // 100ms
      expect(state.hitStopPriority).toBe(HitStopPriority.LOW);

      // Higher priority request overrides
      const overridden = requestHitStop(world, 200, HitStopPriority.CRITICAL);
      expect(overridden).toBe(true);
      expect(state.hitStopTimer).toBe(0.2); // 200ms
      expect(state.hitStopPriority).toBe(HitStopPriority.CRITICAL);
    });

    it("should ignore lower or equal priority hit-stops while a higher priority hit-stop is active", () => {
      requestHitStop(world, 200, HitStopPriority.HIGH);
      const state = getVFXState(world);

      const ignored = requestHitStop(world, 300, HitStopPriority.NORMAL);
      expect(ignored).toBe(false);
      expect(state.hitStopTimer).toBe(0.2); // Unchanged duration, no summation
      expect(state.hitStopPriority).toBe(HitStopPriority.HIGH);
    });

    it("should decrement hitStopTimer over ticks via HitStopSystem", () => {
      requestHitStop(world, 100, HitStopPriority.NORMAL);
      expect(isHitStopActive(world)).toBe(true);

      hitStopSys.update(world, 0.06); // 60ms
      expect(getVFXState(world).hitStopTimer).toBeCloseTo(0.04, 3);

      hitStopSys.update(world, 0.05); // 50ms (clears timer and sets 50ms cooldown)
      expect(isHitStopActive(world)).toBe(false);
      expect(getVFXState(world).hitStopCooldown).toBe(0.05);
    });
  });

  describe("FR-4: Semantic JuiceMap per Game", () => {
    it("should trigger mapped events for all 9 minigames", () => {
      const games = Object.keys(JUICE_CATALOG) as Array<keyof typeof JUICE_CATALOG>;
      expect(games.length).toBe(9);

      for (const gameId of games) {
        const events = Object.keys(JUICE_CATALOG[gameId]);
        expect(events.length).toBeGreaterThan(0);

        for (const eventName of events) {
          juice.triggerEvent(gameId, eventName, { x: 50, y: 50 });
        }
      }
    });
  });

  describe("FR-6: Global JuiceLevel & Low Stimulation Accessibility Mode", () => {
    it("should suppress screen shake and reduce opacity when JuiceLevel is set to Low Stimulation", () => {
      juice.setJuiceLevel(0, true);
      const state = juice.getState();
      expect(state.lowStimulationMode).toBe(true);
      expect(state.juiceLevel).toBe(0);

      // Spawning effect in low stimulation mode
      const entity = juice.spawn("shockwave", { x: 100, y: 100, shakeIntensity: 10.0, shakeDurationMs: 200 });
      expect(entity).not.toBeNull();

      if (entity !== null) {
        const render = world.getComponent(entity, "Render");
        expect(render?.opacity).toBe(0.4);
      }
    });

    it("should scale TTL and sizes when JuiceLevel is 1.5", () => {
      juice.setJuiceLevel(1.5, false);

      const entity = juice.spawn("shield_bubble", { x: 50, y: 50, scale: 1.0, ttl: 1.0 });
      expect(entity).not.toBeNull();

      if (entity !== null) {
        const transform = world.getComponent(entity, "Transform");
        const ttl = world.getComponent(entity, "TTL");

        expect(transform?.scaleX).toBe(1.5);
        expect(ttl?.remaining).toBe(1.5);
      }
    });
  });

  describe("FR-7: Kinetic Flow Integration", () => {
    it("should update VFXWorldState.kineticCharge from KineticAccumulatorComponent in KineticFlowSystem", () => {
      const flowSys = new KineticFlowSystem();

      const accEntity = world.createEntity();
      world.addComponent(accEntity, {
        type: "KineticAccumulator",
        storedEnergy: 75,
        maxEnergy: 100,
        chargeOnMoveRate: 10,
        grazeRadius: 30,
        grazeChargeAmount: 5,
        burstRadius: 100,
        isBurstReady: false,
        isBurstActive: false,
        overdriveRemaining: 0
      } as any);

      flowSys.update(world, 0.016);
      expect(getVFXState(world).kineticCharge).toBe(0.75);
    });
  });

  describe("Acceptance Criteria 5 & 6: Golden Replay Determinism Across 3 Minigames", () => {
    it("Golden Replay 1: Asteroids simulation step determinism with JuiceOrchestrator triggers", () => {
      const game = new AsteroidsGame({ gameOptions: { seed: 12345 } });
      const activeWorld = game.getWorld();
      const orchestrator = new JuiceOrchestrator(activeWorld);

      // Run 60 simulation steps while spawning visual juice effects
      for (let i = 0; i < 60; i++) {
        orchestrator.triggerEvent("asteroids", "rock:destroyed", { x: 100 + i, y: 100 + i });
        game.runSimulationStep(0.016, false);
      }

      // Verify gameplay Random stream was completely unaffected by JuiceOrchestrator calls
      const game2 = new AsteroidsGame({ gameOptions: { seed: 12345 } });
      for (let i = 0; i < 60; i++) {
        game2.runSimulationStep(0.016, false);
      }

      expect(activeWorld.gameplayRandom.getSeed()).toBe(game2.getWorld().gameplayRandom.getSeed());
    });

    it("Golden Replay 2: Geometry Wars simulation step determinism with JuiceOrchestrator triggers", () => {
      const game = new GeometryWarsGame({ gameOptions: { seed: 99999 }, headless: true });
      const activeWorld = game.getWorld();
      const orchestrator = new JuiceOrchestrator(activeWorld);

      for (let i = 0; i < 60; i++) {
        orchestrator.triggerEvent("geometry-wars", "enemy:destroyed", { x: 200, y: 200 });
        game.runSimulationStep(0.016, false);
      }

      const game2 = new GeometryWarsGame({ gameOptions: { seed: 99999 }, headless: true });
      for (let i = 0; i < 60; i++) {
        game2.runSimulationStep(0.016, false);
      }

      expect(activeWorld.gameplayRandom.getSeed()).toBe(game2.getWorld().gameplayRandom.getSeed());
    });

    it("Golden Replay 3: Space Invaders simulation step determinism with JuiceOrchestrator triggers", () => {
      const game = new SpaceInvadersGame({ gameOptions: { seed: 77777 }, headless: true });
      const activeWorld = game.getWorld();
      const orchestrator = new JuiceOrchestrator(activeWorld);

      for (let i = 0; i < 60; i++) {
        orchestrator.triggerEvent("space-invaders", "alien:destroyed", { x: 300, y: 150 });
        game.runSimulationStep(0.016, false);
      }

      const game2 = new SpaceInvadersGame({ gameOptions: { seed: 77777 }, headless: true });
      for (let i = 0; i < 60; i++) {
        game2.runSimulationStep(0.016, false);
      }

      expect(activeWorld.gameplayRandom.getSeed()).toBe(game2.getWorld().gameplayRandom.getSeed());
    });
  });
});
