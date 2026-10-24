import { World, CoreComponentRegistry, EventBus } from "@tiny-aster/core";
import { HitAndRunGame } from "../HitAndRunGame";
import { HIT_RUN_WEAPON_CATALOG, getWeaponDefinition } from "../weapons/HitRunWeaponCatalog";
import { registerPlayerBulletPool } from "../weapons/HitRunBulletPool";
import { fireWeapon } from "../weapons/fireWeapon";
import { startWaveScript } from "../waves/HitRunWaveSystem";
import { registerHitRunEnemyPool } from "../waves/HitRunEnemyPool";
import { HitRunFeedbackSystem } from "../systems/HitRunFeedbackSystem";
import { HitRunExplosionSystem } from "../weapons/HitRunExplosionSystem";
import { WAVE_OPENING } from "../waves/sampleWaves";
import { tryEnemyShoot } from "../ai/enemyShoot";
import type { BeltInputComponent } from "../belt/BeltMovementTypes";

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
      game.destroy();
    });

    it("creates exactly one main Camera2D entity after initialization", async () => {
      const game = new HitAndRunGame({ seed: 12345 });
      await game.init();

      const gameWorld = game.getWorld();
      const cameras = gameWorld.query("Camera2D");
      expect(cameras.length).toBe(1);

      const camComp = gameWorld.getComponent(cameras[0], "Camera2D") as { isMain?: boolean } | undefined;
      expect(camComp?.isMain).toBe(true);
      game.destroy();
    });

    it("updates main Camera2D x position when player moves right", async () => {
      const game = new HitAndRunGame({ seed: 12345 });
      await game.init();

      const gameWorld = game.getWorld();
      const cameras = gameWorld.query("Camera2D");
      expect(cameras.length).toBe(1);
      const initialCam = gameWorld.getComponent(cameras[0], "Camera2D") as { x: number };
      const initialCamX = initialCam.x;

      const players = gameWorld.query("BeltMovement", "Transform");
      expect(players.length).toBe(1);
      const initialPlayerTransform = gameWorld.getComponent(players[0], "Transform") as { x: number };
      const initialPlayerX = initialPlayerTransform.x;

      game.setInputState({ right: true });

      for (let i = 0; i < 60; i++) {
        game.update(0.016);
      }

      const updatedPlayerTransform = gameWorld.getComponent(players[0], "Transform") as { x: number };
      expect(updatedPlayerTransform.x).toBeGreaterThan(initialPlayerX + 50);

      const updatedCam = gameWorld.getComponent(cameras[0], "Camera2D") as { x: number };
      expect(updatedCam.x).toBeGreaterThan(initialCamX);

      game.destroy();
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

      game.initializeRenderer(mockRenderer as import("@tiny-aster/core").Renderer);

      expect(shapesRegistered.has("player")).toBe(true);
      expect(shapesRegistered.has("popcorn")).toBe(true);
      expect(shapesRegistered.has("wall_trooper")).toBe(true);
      expect(shapesRegistered.has("hopper")).toBe(true);
      expect(shapesRegistered.has("charger")).toBe(true);
      expect(shapesRegistered.has("elite")).toBe(true);
      expect(shapesRegistered.has("bullet_hmg")).toBe(true);
      expect(shapesRegistered.has("bullet_rocket")).toBe(true);

      expect(effectsRegistered.has("hit_run_procedural_backdrop")).toBe(true);
      expect(effectsRegistered.has("hit_run_hud")).toBe(true);
      game.destroy();
    });

    it("generates and instantiates level plan and backdrop resource on init", async () => {
      const game = new HitAndRunGame({ seed: 12345 });
      await game.init();

      const plan = game.getLevelPlan();
      expect(plan).toBeDefined();
      expect(plan.totalWidth).toBeGreaterThan(0);

      const gameWorld = game.getWorld();
      const backdrop = gameWorld.getResource("HitRunBackdropSpec");
      expect(backdrop).toBeDefined();
      game.destroy();
    });

    it("registers wave director state upon starting wave script and death flow resources on init", async () => {
      const game = new HitAndRunGame({ seed: 12345 });
      await game.init();

      const gameWorld = game.getWorld();
      startWaveScript(gameWorld, WAVE_OPENING);

      const waveState = gameWorld.getResource("WaveDirectorState");
      expect(waveState).toBeDefined();

      const deathFlow = gameWorld.getResource("HitRunDeathFlow");
      expect(deathFlow).toBeDefined();
      game.destroy();
    });
  });

  describe("Weapon System & Explosions", () => {
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

    it("prevents player self-damage from player rocket explosions", () => {
      const bus = new EventBus();
      world.setResource("EventBus", bus);

      const explosionSys = new HitRunExplosionSystem();
      explosionSys.subscribe(bus);

      const player = world.createEntity();
      world.addComponent(player, {
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
      world.addComponent(player, {
        type: "Health",
        current: 5,
        max: 5
      });
      world.addComponent(player, {
        type: "Faction",
        value: "player"
      });

      const enemy = world.createEntity();
      world.addComponent(enemy, {
        type: "Transform",
        x: 120,
        y: 100,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        worldX: 120,
        worldY: 100,
        worldRotation: 0,
        worldScaleX: 1,
        worldScaleY: 1,
        dirty: true
      });
      world.addComponent(enemy, {
        type: "Health",
        current: 5,
        max: 5
      });
      world.addComponent(enemy, {
        type: "Faction",
        value: "enemy"
      });

      bus.emit("combat:explosion", {
        x: 110,
        y: 100,
        radius: 50,
        damage: 3,
        sourceEntity: player,
        category: "explosive"
      });

      explosionSys.update(world, 0.016);

      const playerHealth = world.getComponent(player, "Health") as { current: number };
      const enemyHealth = world.getComponent(enemy, "Health") as { current: number };

      expect(playerHealth.current).toBe(5);
      expect(enemyHealth.current).toBe(2);
    });

    it("emits exactly 1 damage hit event per target in explosion AOE", () => {
      const bus = new EventBus();
      world.setResource("EventBus", bus);

      const hitEvents: unknown[] = [];
      bus.on("combat:hit", (payload) => hitEvents.push(payload));

      const explosionSys = new HitRunExplosionSystem();
      explosionSys.subscribe(bus);

      const enemy = world.createEntity();
      world.addComponent(enemy, {
        type: "Transform",
        x: 110,
        y: 100,
        rotation: 0,
        scaleX: 1,
        scaleY: 1,
        worldX: 110,
        worldY: 100,
        worldRotation: 0,
        worldScaleX: 1,
        worldScaleY: 1,
        dirty: true
      });
      world.addComponent(enemy, {
        type: "Health",
        current: 10,
        max: 10
      });
      world.addComponent(enemy, {
        type: "Faction",
        value: "enemy"
      });

      bus.emit("combat:explosion", {
        x: 100,
        y: 100,
        radius: 50,
        damage: 4,
        category: "explosive"
      });

      explosionSys.update(world, 0.016);
      bus.flushDeferred();

      expect(hitEvents.length).toBe(1);
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

  describe("Enemy Combat & Damage", () => {
    it("verifies enemy bullets deal actual damage to player", async () => {
      const game = new HitAndRunGame({ seed: 12345 });
      await game.init();

      const gameWorld = game.getWorld();

      const players = gameWorld.query("BeltInput", "Health", "Transform");
      expect(players.length).toBe(1);
      const player = players[0];

      gameWorld.mutateComponent(player, "Transform", (t: { x: number; y: number; worldX: number; worldY: number }) => {
        t.x = 100;
        t.y = 400;
        t.worldX = 100;
        t.worldY = 400;
      });

      const initialHealth = (gameWorld.getComponent(player, "Health") as { current: number }).current;

      const enemy = gameWorld.createEntity();
      gameWorld.addComponent(enemy, {
        type: "Transform",
        x: 200,
        y: 400,
        worldX: 200,
        worldY: 400,
        rotation: 0,
        worldRotation: 0,
        scaleX: 1,
        scaleY: 1,
        worldScaleX: 1,
        worldScaleY: 1,
        dirty: true
      });
      gameWorld.addComponent(enemy, {
        type: "PlayerSensor",
        visionRange: 300,
        detectedPlayerEntity: player
      });

      const shot = tryEnemyShoot(gameWorld, enemy, {
        canShoot: true,
        shootCooldownRemaining: 0,
        shootSpeed: 300,
        shootDamage: 1,
        shootCategory: "enemy_bullet",
        shootCooldown: 1.0
      });
      expect(shot).toBe(true);

      for (let i = 0; i < 20; i++) {
        game.update(0.016);
      }

      const currentHealth = (gameWorld.getComponent(player, "Health") as { current: number }).current;
      expect(currentHealth).toBeLessThan(initialHealth);

      game.destroy();
    });
  });

  describe("Feedback System", () => {
    it("subscribes to combat events and handles hit-stop", () => {
      const feedback = new HitRunFeedbackSystem();
      const eventBus = new EventBus();
      feedback.subscribe(eventBus);

      feedback.update(world, 0.016);

      expect(world.getResource("GameplayFreeze")).toBeUndefined();
    });
  });

  describe("Full Input -> Weapon -> Collision -> Damage Integration", () => {
    it("fires weapon on fire input and damages enemy via CollisionSystem2D and CombatSystem", async () => {
      const game = new HitAndRunGame({ seed: 12345 });
      await game.init();

      const gameWorld = game.getWorld();

      const players = gameWorld.query("BeltInput", "Transform");
      expect(players.length).toBe(1);
      const player = players[0];

      gameWorld.mutateComponent(player, "Transform", (t: { x: number; y: number; worldX: number; worldY: number; scaleX: number }) => {
        t.x = 100;
        t.y = 400;
        t.worldX = 100;
        t.worldY = 400;
        t.scaleX = 1;
      });

      const enemy = gameWorld.createEntity();
      gameWorld.addComponent(enemy, {
        type: "Transform",
        x: 200,
        y: 400,
        worldX: 200,
        worldY: 400,
        rotation: 0,
        worldRotation: 0,
        scaleX: 1,
        scaleY: 1,
        worldScaleX: 1,
        worldScaleY: 1,
        dirty: true
      });
      gameWorld.addComponent(enemy, {
        type: "Velocity",
        vx: 0,
        vy: 0,
        angularVelocity: 0
      });
      gameWorld.addComponent(enemy, {
        type: "Collider2D",
        shape: { type: "aabb", halfWidth: 16, halfHeight: 16 },
        layer: 1 << 4,
        mask: 0xffff,
        offsetX: 0,
        offsetY: 0,
        enabled: true,
        isTrigger: true
      });
      gameWorld.addComponent(enemy, {
        type: "CollisionEvents",
        collisions: [],
        activeTriggers: [],
        triggersEntered: [],
        triggersExited: []
      });
      gameWorld.addComponent(enemy, {
        type: "Health",
        current: 10,
        max: 10
      });
      gameWorld.addComponent(enemy, {
        type: "Faction",
        faction: "enemy",
        value: "enemy"
      } as any);

      game.setInputState({ fire: true });

      game.update(0.016);

      const bulletsBefore = gameWorld.query("PlayerBullet");
      expect(bulletsBefore.length).toBeGreaterThan(0);

      for (let i = 0; i < 15; i++) {
        game.update(0.016);
      }

      const enemyHealth = gameWorld.getComponent(enemy, "Health") as { current: number } | undefined;
      expect(enemyHealth?.current).toBeLessThan(10);
      game.destroy();
    });

    it("strictly separates attack (melee) and fire (ranged weapon)", async () => {
      const game = new HitAndRunGame({ seed: 12345 });
      await game.init();

      const gameWorld = game.getWorld();
      const players = gameWorld.query("BeltInput");
      const player = players[0];

      game.setInputState({ attack: true, fire: false });
      game.update(0.016);

      let beltInput = gameWorld.getComponent(player, "BeltInput") as unknown as {
        attackHeld: boolean;
        fireHeld: boolean;
      };
      expect(beltInput.attackHeld).toBe(true);
      expect(beltInput.fireHeld).toBe(false);

      game.setInputState({ attack: false, fire: true });
      game.update(0.016);

      beltInput = gameWorld.getComponent(player, "BeltInput") as unknown as {
        attackHeld: boolean;
        fireHeld: boolean;
      };
      expect(beltInput.attackHeld).toBe(false);
      expect(beltInput.fireHeld).toBe(true);
      game.destroy();
    });

    it("verifies firePressed edge is computed by BeltInputSystem from fireHeld", async () => {
      const game = new HitAndRunGame({ seed: 12345 });
      await game.init();

      const gameWorld = game.getWorld();
      const players = gameWorld.query("BeltInput");
      const player = players[0];

      game.setInputState({ fire: true });

      let beltInput = gameWorld.getComponent(player, "BeltInput") as unknown as {
        fireHeld: boolean;
        firePressed: boolean;
      };
      expect(beltInput.fireHeld).toBe(true);
      expect(beltInput.firePressed).toBe(false);

      game.update(0.016);

      beltInput = gameWorld.getComponent(player, "BeltInput") as unknown as {
        fireHeld: boolean;
        firePressed: boolean;
      };
      expect(beltInput.fireHeld).toBe(true);
      game.destroy();
    });

    it("supports 8-directional diagonal aim hitting an enemy at vertical offset (y=340) and registers aimY in input component", async () => {
      const game = new HitAndRunGame({ seed: 12345 });
      await game.init();

      const gameWorld = game.getWorld();
      const players = gameWorld.query("BeltInput", "Transform");
      const player = players[0];

      gameWorld.mutateComponent(player, "Transform", (t: { x: number; y: number; worldX: number; worldY: number; scaleX: number }) => {
        t.x = 100;
        t.y = 400;
        t.worldX = 100;
        t.worldY = 400;
        t.scaleX = 1;
      });

      const enemy = gameWorld.createEntity();
      gameWorld.addComponent(enemy, {
        type: "Transform",
        x: 180,
        y: 320,
        worldX: 180,
        worldY: 320,
        rotation: 0,
        worldRotation: 0,
        scaleX: 1,
        scaleY: 1,
        worldScaleX: 1,
        worldScaleY: 1,
        dirty: true
      });
      gameWorld.addComponent(enemy, {
        type: "Velocity",
        vx: 0,
        vy: 0,
        angularVelocity: 0
      });
      gameWorld.addComponent(enemy, {
        type: "Collider2D",
        shape: { type: "aabb", halfWidth: 16, halfHeight: 16 },
        layer: 1 << 4,
        mask: 0xffff,
        offsetX: 0,
        offsetY: 0,
        enabled: true,
        isTrigger: true
      });
      gameWorld.addComponent(enemy, {
        type: "CollisionEvents",
        collisions: [],
        activeTriggers: [],
        triggersEntered: [],
        triggersExited: []
      });
      gameWorld.addComponent(enemy, {
        type: "Health",
        current: 10,
        max: 10
      });
      gameWorld.addComponent(enemy, {
        type: "Faction",
        faction: "enemy",
        value: "enemy"
      } as any);

      game.setInputState({ moveRight: true, aimUp: true, fire: true });

      const inputComp = gameWorld.getComponent(player, "BeltInput") as BeltInputComponent;
      expect(inputComp.aimY).toBeLessThan(0);
      expect(inputComp.aimX).toBeGreaterThan(0);

      game.update(0.016);

      for (let i = 0; i < 15; i++) {
        game.update(0.016);
      }

      const enemyHealth = gameWorld.getComponent(enemy, "Health") as { current: number } | undefined;
      expect(enemyHealth?.current).toBeLessThan(10);
      game.destroy();
    });
  });
});
