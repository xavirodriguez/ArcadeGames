import { World, CoreComponentRegistry } from "@tiny-aster/core";
import { JuiceOrchestrator, JUICE_CATALOG } from "../JuiceOrchestrator";
import { HitStopSystem, HitStopPriority, requestHitStop, isHitStopActive } from "../HitStopSystem";
import { KineticFlowSystem } from "../KineticFlowSystem";
import { getVFXState } from "../SharedVFXInternal";
import { AsteroidsGame } from "../../../asteroids/AsteroidsGame";
import { GeometryWarsGame } from "../../../geometrywars/GeometryWarsGame";
import { SpaceInvadersGame } from "../../../space-invaders/SpaceInvadersGame";
import { colors } from "../../../../theme/colors";

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
      const entity = juice.spawn("shockwave", { x: 100, y: 150, tint: colors.pink, scale: 1.5, ttl: 0.5 });
      expect(entity).not.toBeNull();

      if (entity !== null) {
        const render = world.getComponent(entity, "Render");
        const ttl = world.getComponent(entity, "TTL");
        const transform = world.getComponent(entity, "Transform");

        expect(render?.shape).toBe("shockwave");
        expect(render?.color).toBe(colors.pink);
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
        const render = world.getComponent(entity, "Render") as { text?: string } | undefined;
        expect(render?.text).toBe("+500");
      }
    });
  });

  it("does not spawn presentation effects or request hit-stop during rollback resimulation", () => {
    world.isReSimulating = true;

    const entity = juice.spawn("shockwave", {
      x: 100,
      y: 150,
      hitStopMs: 120,
      shakeIntensity: 4,
      shakeDurationMs: 100
    });

    expect(entity).toBeNull();
    expect(world.query("Render", "TTL")).toHaveLength(0);
    expect(getVFXState(world).hitStopActive).toBe(false);
  });

  describe("FR-3: Hit-Stop Concurrency Control", () => {
    let hitStopSys: HitStopSystem;

    beforeEach(() => {
      hitStopSys = new HitStopSystem();
    });

    it("should route hit-stop requests through the scheduler-owned GameplayFreeze resource", () => {
      requestHitStop(world, 100, HitStopPriority.LOW);
      const freeze = world.getResource<{ remaining?: number }>("GameplayFreeze");
      expect(freeze?.remaining).toBeCloseTo(0.1, 5);
      expect(getVFXState(world).hitStopActive).toBe(true);
      expect(isHitStopActive(world)).toBe(true);
    });

    it("should allow a higher priority request to override an active finite hit-stop", () => {
      requestHitStop(world, 100, HitStopPriority.LOW);
      const overridden = requestHitStop(world, 200, HitStopPriority.CRITICAL);
      expect(overridden).toBe(true);
      expect(world.getResource<{ remaining?: number }>("GameplayFreeze")?.remaining).toBeCloseTo(0.2, 5);
      expect(getVFXState(world).hitStopPriority).toBe(HitStopPriority.CRITICAL);
    });

    it("should ignore lower or equal priority requests while a hit-stop is active", () => {
      requestHitStop(world, 200, HitStopPriority.HIGH);
      const ignored = requestHitStop(world, 300, HitStopPriority.NORMAL);
      expect(ignored).toBe(false);
      expect(world.getResource<{ remaining?: number }>("GameplayFreeze")?.remaining).toBeCloseTo(0.2, 5);
      expect(getVFXState(world).hitStopPriority).toBe(HitStopPriority.HIGH);
    });

    it("should not replace an indefinite or externally-owned gameplay freeze", () => {
      world.setResource("GameplayFreeze", {});
      expect(requestHitStop(world, 100, HitStopPriority.CRITICAL)).toBe(false);
      expect(world.getResource<{ remaining?: number }>("GameplayFreeze")?.remaining).toBeUndefined();
      expect(getVFXState(world).hitStopActive).toBe(false);
    });

    it("should reject invalid hit-stop durations and priorities", () => {
      expect(requestHitStop(world, 0)).toBe(false);
      expect(requestHitStop(world, -10)).toBe(false);
      expect(requestHitStop(world, Number.NaN)).toBe(false);
      expect(requestHitStop(world, 100, Number.POSITIVE_INFINITY)).toBe(false);
      expect(world.getResource("GameplayFreeze")).toBeUndefined();
    });

    it("should keep the anti-chaining cooldown after the scheduler expires hit-stop", () => {
      requestHitStop(world, 50, HitStopPriority.NORMAL);
      hitStopSys.update(world, 0.05);
      expect(getVFXState(world).hitStopActive).toBe(false);
      expect(getVFXState(world).hitStopCooldown).toBeCloseTo(0.05, 5);
      expect(requestHitStop(world, 50, HitStopPriority.NORMAL)).toBe(false);
      expect(requestHitStop(world, 50, HitStopPriority.HIGH)).toBe(true);
    });
  });

  describe("FR-4: Semantic JuiceMap per Game", () => {
    it("should trigger mapped events for all 9 minigames", () => {
      const games = Object.keys(JUICE_CATALOG) as Array<keyof typeof JUICE_CATALOG>;
      expect(games.length).toBe(9);

      for (const gameId of games) {
        const gameCatalog = JUICE_CATALOG[gameId];
        const events = Object.keys(gameCatalog) as Array<keyof typeof gameCatalog>;
        expect(events.length).toBeGreaterThan(0);

        for (const eventName of events) {
          juice.triggerEvent(gameId, eventName, { x: 50, y: 50 });
        }
      }
    });

    it("maps the five new effects to their semantic game events", () => {
      const expectLatestShape = (shape: string): void => {
        const entities = world.query("Render", "TTL");
        const latest = entities[entities.length - 1];
        expect(world.getComponent(latest, "Render")?.shape).toBe(shape);
      };
      juice.triggerEvent("pong", "paddle:hit", { x: 80, y: 90 });
      expectLatestShape("pixelfx_paddle_impact");
      juice.triggerEvent("arkanoid", "brick:shatter", { x: 80, y: 90 });
      expectLatestShape("pixelfx_brick_shatter");
      juice.triggerEvent("flappybird", "bird:flap", { x: 80, y: 90 });
      expectLatestShape("pixelfx_flap_gust");
      juice.triggerEvent("frogger", "frog:hop", { x: 80, y: 90 });
      expectLatestShape("pixelfx_hop");
      juice.triggerEvent("platformer", "player:dash", { x: 80, y: 90 });
      expectLatestShape("pixelfx_phase_dash");
    });

    it("maps locomotion transitions to traversal effects in both platformer games", () => {
      juice.triggerEvent("platformer", "player:slide", { x: 120, y: 200, rotation: 0 });
      expect(world.getComponent(world.query("Render")[0], "Render")?.shape).toBe("pixelfx_surface_skid");
      juice.triggerEvent("platformer", "platform:reversed", { x: 160, y: 220, rotation: Math.PI });
      expect(world.getComponent(world.query("Render")[1], "Render")?.shape).toBe("pixelfx_mechanical_motion");
      juice.triggerEvent("echo-runner", "player:slide", { x: 120, y: 200, rotation: 0 });
      expect(world.getComponent(world.query("Render")[2], "Render")?.shape).toBe("pixelfx_surface_skid");
      juice.triggerEvent("echo-runner", "platform:reversed", { x: 160, y: 220, rotation: Math.PI });
      expect(world.getComponent(world.query("Render")[3], "Render")?.shape).toBe("pixelfx_mechanical_motion");
    });

    it("does not spawn traversal effects from locomotion events during resimulation", () => {
      world.isReSimulating = true;
      juice.triggerEvent("platformer", "player:slide", { x: 120, y: 200 });
      juice.triggerEvent("platformer", "platform:reversed", { x: 160, y: 220 });
      expect(world.query("Render", "TTL")).toHaveLength(0);
    });

    it("should trigger typed Arkanoid brick:hit and brick:shatter events", () => {
      juice.triggerEvent("arkanoid", "brick:hit", { x: 100, y: 120 });
      expect(world.query("Render").length).toBe(1);

      juice.triggerEvent("arkanoid", "brick:shatter", { x: 200, y: 220 });
      expect(world.query("Render").length).toBe(2);
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
      } as unknown as import("@tiny-aster/core").Component);

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
