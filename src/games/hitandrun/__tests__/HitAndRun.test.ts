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
