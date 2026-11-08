import { World } from "../src/ecs/World";
import { CoreComponentRegistry } from "../src/ecs/CoreComponents";
import { Juice } from "../src/utils/Juice";
import { ScreenShakeSystem } from "../src/systems/ScreenShakeSystem";
import type { SpaceInvadersComponentRegistry, GameStateComponent } from "../../../src/games/space-invaders/types/SpaceInvadersTypes";

describe("Juice.shake & ScreenShakeSystem Contract (Fase 2)", () => {
  let world: World<CoreComponentRegistry>;

  beforeEach(() => {
    world = new World<CoreComponentRegistry>();
  });

  describe("Destination 1: ScreenShake singleton component", () => {
    it("converts input milliseconds to seconds on singleton component", () => {
      const shakeEnt = world.createEntity();
      world.addComponent(shakeEnt, {
        type: "ScreenShake",
        intensity: 0,
        duration: 0,
        remaining: 0
      });

      // Request shake of 5 intensity for 200 ms
      Juice.shake(world, 5, 200);

      const shake = world.getComponent(shakeEnt, "ScreenShake");
      expect(shake).toBeDefined();
      expect(shake?.intensity).toBe(5);
      expect(shake?.duration).toBeCloseTo(0.2, 5);
      expect(shake?.remaining).toBeCloseTo(0.2, 5);
    });

    it("does not override an active higher-intensity shake with a lower-intensity shake", () => {
      const shakeEnt = world.createEntity();
      world.addComponent(shakeEnt, {
        type: "ScreenShake",
        intensity: 10,
        duration: 0.5,
        remaining: 0.5
      });

      // Request weaker shake: intensity 3 for 100 ms
      Juice.shake(world, 3, 100);

      const shake = world.getComponent(shakeEnt, "ScreenShake");
      expect(shake?.intensity).toBe(10);
      expect(shake?.duration).toBe(0.5);
      expect(shake?.remaining).toBe(0.5);
    });

    it("increases remaining duration if new shake has a longer duration", () => {
      const shakeEnt = world.createEntity();
      world.addComponent(shakeEnt, {
        type: "ScreenShake",
        intensity: 5,
        duration: 0.1,
        remaining: 0.05
      });

      // Request same intensity but longer duration: 300 ms (0.3 s)
      Juice.shake(world, 5, 300);

      const shake = world.getComponent(shakeEnt, "ScreenShake");
      expect(shake?.intensity).toBe(5);
      expect(shake?.duration).toBeCloseTo(0.3, 5);
      expect(shake?.remaining).toBeCloseTo(0.3, 5);
    });
  });

  describe("Destination 2: ScreenShake world resource", () => {
    it("converts input milliseconds to seconds on world resource", () => {
      world.setResource("ScreenShake", {
        intensity: 0,
        duration: 0,
        remaining: 0
      });

      Juice.shake(world, 4, 150);

      const res = world.getResource<{ intensity: number; duration: number; remaining: number }>("ScreenShake");
      expect(res).toBeDefined();
      expect(res?.intensity).toBe(4);
      expect(res?.duration).toBeCloseTo(0.15, 5);
      expect(res?.remaining).toBeCloseTo(0.15, 5);
    });

    it("preserves higher intensity on resource when weaker shake arrives", () => {
      world.setResource("ScreenShake", {
        intensity: 8,
        duration: 0.4,
        remaining: 0.3
      });

      Juice.shake(world, 2, 200);

      const res = world.getResource<{ intensity: number; duration: number; remaining: number }>("ScreenShake");
      expect(res?.intensity).toBe(8);
      expect(res?.duration).toBe(0.4);
      expect(res?.remaining).toBe(0.3);
    });
  });

  describe("Destination 3: GameState.screenShake legacy singleton", () => {
    it("converts input milliseconds to seconds without heuristic threshold", () => {
      const siWorld = new World<SpaceInvadersComponentRegistry>();
      const gsEnt = siWorld.createEntity();
      siWorld.addComponent(gsEnt, {
        type: "GameState",
        score: 0,
        lives: 3,
        level: 1,
        invadersRemaining: 1,
        isGameOver: false,
        screenShake: null,
        kamikazesActive: 0,
        readyRemaining: 0,
        intermissionRemaining: 0,
        continueCountdownRemaining: 0,
        continuesRemaining: 3
      });

      Juice.shake(siWorld, 6, 250);

      const gs = siWorld.getComponent(gsEnt, "GameState");
      expect(gs?.screenShake).toBeDefined();
      expect(gs?.screenShake?.intensity).toBe(6);
      expect(gs?.screenShake?.duration).toBeCloseTo(0.25, 5);
      expect(gs?.screenShake?.totalDuration).toBeCloseTo(0.25, 5);
      expect(gs?.screenShake?.elapsed).toBe(0);
    });

    it("converts short durations (e.g. 5ms) to seconds without assuming it was already in seconds", () => {
      const siWorld = new World<SpaceInvadersComponentRegistry>();
      const gsEnt = siWorld.createEntity();
      siWorld.addComponent(gsEnt, {
        type: "GameState",
        score: 0,
        lives: 3,
        level: 1,
        invadersRemaining: 1,
        isGameOver: false,
        screenShake: null,
        kamikazesActive: 0,
        readyRemaining: 0,
        intermissionRemaining: 0,
        continueCountdownRemaining: 0,
        continuesRemaining: 3
      });

      // In the legacy code, duration <= 10 was kept as seconds (5 seconds!), causing a massive bug.
      // Now 5 ms must be 0.005 seconds.
      Juice.shake(siWorld, 2, 5);

      const gs = siWorld.getComponent(gsEnt, "GameState");
      expect(gs?.screenShake?.duration).toBeCloseTo(0.005, 5);
      expect(gs?.screenShake?.totalDuration).toBeCloseTo(0.005, 5);
    });
  });

  describe("ScreenShakeSystem camera integration", () => {
    it("resets VisualOffset cleanly to 0 upon expiration", () => {
      const shakeEnt = world.createEntity();
      world.addComponent(shakeEnt, {
        type: "ScreenShake",
        intensity: 5,
        duration: 0.1,
        remaining: 0.1
      });

      const camEnt = world.createEntity();
      world.addComponent(camEnt, {
        type: "Camera2D",
        isMain: true,
        x: 0,
        y: 0,
        targetX: 0,
        targetY: 0,
        zoom: 1
      });
      world.addComponent(camEnt, {
        type: "VisualOffset",
        offsetX: 0,
        offsetY: 0
      });

      const system = new ScreenShakeSystem();

      // Tick 1: active shake
      system.update(world, 0.05);

      const offsetActive = world.getComponent(camEnt, "VisualOffset");
      expect(offsetActive).toBeDefined();

      const shakeState = world.getComponent(shakeEnt, "ScreenShake");
      expect(shakeState?.remaining).toBeCloseTo(0.05, 5);

      // Tick 2: shake expires
      system.update(world, 0.06);

      const shakeExpired = world.getComponent(shakeEnt, "ScreenShake");
      expect(shakeExpired?.remaining).toBe(0);
      expect(shakeExpired?.intensity).toBe(0);

      const offsetExpired = world.getComponent(camEnt, "VisualOffset");
      expect(offsetExpired?.offsetX).toBe(0);
      expect(offsetExpired?.offsetY).toBe(0);
    });
  });
});
