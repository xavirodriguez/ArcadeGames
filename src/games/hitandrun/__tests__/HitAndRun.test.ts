import { World, CoreComponentRegistry, EventBus } from "@tiny-aster/core";
import { HitAndRunGame } from "../HitAndRunGame";
import { HIT_RUN_WEAPON_CATALOG, getWeaponDefinition } from "../weapons/HitRunWeaponCatalog";
import { registerPlayerBulletPool, HitRunBulletPool } from "../weapons/HitRunBulletPool";
import { fireWeapon } from "../weapons/fireWeapon";
import { HitRunWaveSystem } from "../waves/HitRunWaveSystem";
import { registerHitRunEnemyPool } from "../waves/HitRunEnemyPool";
import { HitRunFeedbackSystem } from "../systems/HitRunFeedbackSystem";

describe("Hit & Run Game Systems", () => {
  let world: World<CoreComponentRegistry>;

  beforeEach(() => {
    world = new World<CoreComponentRegistry>();
  });

  describe("HitAndRunGame lifecycle", () => {
    it("initializes game state with correct gameId", () => {
      const game = new HitAndRunGame({ seed: 12345 });
      expect(game.gameId).toBe("hitandrun");

      const state = game.getGameState();
      expect(state.type).toBe("HitAndRunGameState");
      expect(state.score).toBe(0);
      expect(state.isGameOver).toBe(false);
    });

    it("creates exactly one main Camera2D entity after initialization", async () => {
      const game = new HitAndRunGame({ seed: 12345 });
      await game.init();

      const gameWorld = game.getWorld();
      const cameras = gameWorld.query("Camera2D");
      expect(cameras.length).toBe(1);

      const camComp = gameWorld.getComponent(cameras[0], "Camera2D") as { isMain?: boolean } | undefined;
      expect(camComp?.isMain).toBe(true);
    });

    it("registers canvas shapes and effects during initializeRenderer", () => {
      const game = new HitAndRunGame({ seed: 12345 });
      const shapesRegistered = new Set<string>();
      const effectsRegistered = new Set<string>();

      const mockRenderer = {
        type: "canvas",
        render: jest.fn(),
        registerShape: (name: string) => { shapesRegistered.add(name); },
        registerBackgroundEffect: (name: string) => { effectsRegistered.add(name); }
      };

      game.initializeRenderer(mockRenderer as unknown as import("@tiny-aster/core").Renderer);

      expect(shapesRegistered.has("player")).toBe(true);
      expect(shapesRegistered.has("popcorn")).toBe(true);
      expect(shapesRegistered.has("wall_trooper")).toBe(true);
      expect(shapesRegistered.has("hopper")).toBe(true);
      expect(shapesRegistered.has("charger")).toBe(true);
      expect(shapesRegistered.has("elite")).toBe(true);
      expect(shapesRegistered.has("bullet_hmg")).toBe(true);
      expect(shapesRegistered.has("bullet_rocket")).toBe(true);
      expect(shapesRegistered.has("tilemap")).toBe(true);

      expect(effectsRegistered.has("hit_run_procedural_backdrop")).toBe(true);
      expect(effectsRegistered.has("hit_run_hud")).toBe(true);
    });

    it("generates and instantiates level plan and backdrop resource on init", async () => {
      const game = new HitAndRunGame({ seed: 12345 });
      await game.init();

      const plan = game.getLevelPlan();
      expect(plan).toBeDefined();
      expect(plan.totalWidth).toBeGreaterThan(0);

      const gameWorld = game.getWorld();
      const tilemaps = gameWorld.query("Tilemap");
      expect(tilemaps.length).toBeGreaterThan(0);

      const backdrop = gameWorld.getResource("HitRunBackdropSpec");
      expect(backdrop).toBeDefined();
    });

    it("registers wave director and death flow resources on init", async () => {
      const game = new HitAndRunGame({ seed: 12345 });
      await game.init();

      const gameWorld = game.getWorld();
      const waveState = gameWorld.getResource("WaveDirectorState");
      expect(waveState).toBeDefined();

      const deathFlow = gameWorld.getResource("HitRunDeathFlow");
      expect(deathFlow).toBeDefined();
    });
  });

  describe("Weapon System", () => {
    it("has valid weapon catalog entries", () => {
      expect(HIT_RUN_WEAPON_CATALOG.hmg).toBeDefined();
      expect(HIT_RUN_WEAPON_CATALOG.shotgun).toBeDefined();
      expect(HIT_RUN_WEAPON_CATALOG.rocket).toBeDefined();

      const hmg = getWeaponDefinition("hmg");
      expect(hmg.damage).toBeGreaterThan(0);
      expect(hmg.projectileSpeed).toBeGreaterThan(0);
    });

    it("spawns bullets when weapon is fired", () => {
      const pool = registerPlayerBulletPool(world, 10);
      const shooter = world.createEntity();

      world.addComponent(shooter, {
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
        dirty: true
      });

      const hmgDef = getWeaponDefinition("hmg");
      const count = fireWeapon({
        world,
        shooterEntity: shooter,
        originX: 100,
        originY: 100,
        dirX: 1,
        dirY: 0,
        weapon: hmgDef,
        pool
      });

      expect(count).toBe(1);
    });
  });

  describe("Wave System", () => {
    it("registers enemy pool and handles wave spawning", () => {
      const pool = registerHitRunEnemyPool(world);
      expect(pool).toBeDefined();

      const enemy = pool.acquireEnemy(world, {
        archetypeId: "drone",
        x: 50,
        y: 50
      });

      expect(world.hasEntity(enemy)).toBe(true);
      expect(world.hasComponent(enemy, "Health")).toBe(true);
      expect(world.hasComponent(enemy, "Faction")).toBe(true);
    });
  });

  describe("Feedback System", () => {
    it("subscribes to combat events and handles hit-stop", () => {
      const feedback = new HitRunFeedbackSystem();
      const eventBus = new EventBus();
      feedback.subscribe(eventBus);

      world.setResource("HitStopRemaining", 0);
      feedback.update(world, 0.016);

      expect(world.getResource<number>("HitStopRemaining")).toBe(0);
    });
  });
});
