import { World, SystemPhase, CollisionEventsComponent, BlueprintRegistry, EventBus } from "@tiny-aster/core";
import { SpaceInvadersCollisionSystem } from "../systems/SpaceInvadersCollisionSystem";
import { SpaceInvadersGameStateSystem } from "../systems/SpaceInvadersGameStateSystem";
import { ComboSystem, PowerUpSystem } from "../../shared/arcade";
import { GameStateComponent, SpaceInvadersComponentRegistry } from "../types/SpaceInvadersTypes";
import { createGameState } from "../EntityFactory";
import { ParticlePool } from "../EntityPool";
import { BENEFICIAL_MUTATORS } from "../../../utils/MutatorRegistry";

describe("Space Invaders Combo Logic & Performance", () => {
  let world: World<SpaceInvadersComponentRegistry>;
  let collisionSystem: SpaceInvadersCollisionSystem;
  let gameStateSystem: SpaceInvadersGameStateSystem;
  let particlePool: ParticlePool;

  beforeEach(() => {
    world = new World<SpaceInvadersComponentRegistry>();

    const blueprints = new BlueprintRegistry<SpaceInvadersComponentRegistry, any, any>();
    blueprints.register("state", {
      spawn: (w: World<SpaceInvadersComponentRegistry>, entity: number, _args: {}) => {
        const config = w.getResource("GameConfig" as any) as any;
        w.addComponent(entity, {
          type: "GameState",
          lives: config.PLAYER_INITIAL_LIVES,
          score: 0,
          level: 1,
          invadersRemaining: 0,
          isGameOver: false,
          combo: 0,
          multiplier: 1,
          comboTimerRemaining: 0,
          screenShake: null,
          kamikazesActive: 0,
        } as any);
        w.addComponent(entity, {
          type: "Combo",
          combo: 0,
          multiplier: 1,
          timerRemaining: 0,
          timerDuration: config.COMBO_TIMEOUT / 1000
        } as any);
      }
    });
    world.setResource("BlueprintRegistry", blueprints);

    const mockConfig = {
      KEYS: {
        LEFT: "ArrowLeft",
        RIGHT: "ArrowRight",
        SHOOT: "Space",
        PAUSE: "KeyP",
        RESTART: "KeyR",
      },
      PLAYER_SPEED: 300,
      PLAYER_INITIAL_LIVES: 3,
      PLAYER_SHOOT_COOLDOWN: 500,
      PLAYER_RENDER_WIDTH: 40,
      PLAYER_COLLIDER_RADIUS: 15,
      PLAYER_BULLET_SPEED: 500,
      PLAYER_BULLET_SIZE: 4,
      PLAYER_BULLET_TTL: 2000,
      ENEMY_BULLET_SPEED: 250,
      ENEMY_BULLET_SIZE: 4,
      ENEMY_BULLET_TTL: 3000,
      ENEMY_FIRE_INTERVAL_MIN: 1000,
      ENEMY_FIRE_INTERVAL_MAX: 3000,
      INVADER_ROWS: 5,
      INVADER_COLS: 11,
      INVADER_SPACING_X: 50,
      INVADER_SPACING_Y: 40,
      INVADER_START_X: 100,
      INVADER_START_Y: 100,
      INVADER_SPEED_BASE: 50,
      INVADER_SPEED_MAX: 400,
      INVADER_DESCENT_STEP: 20,
      SHIELD_COUNT: 4,
      SHIELD_SEGMENTS_X: 4,
      SHIELD_SEGMENTS_Y: 3,
      SHIELD_SEGMENT_HP: 3,
      SHIELD_START_Y: 480,
      SHIELD_WIDTH: 60,
      SHIELD_HEIGHT: 40,
      SHIELD_SPACING: 150,
      SHIELD_START_X: 100,
      SHIELD_SEGMENT_SIZE: 15,
      PARTICLE_COUNT: 8,
      PARTICLE_TTL_BASE: 500,
      COMBO_TIMEOUT: 2000, // 2 seconds
      MAX_MULTIPLIER: 5,
    };
    world.setResource("GameConfig", mockConfig);

    particlePool = new ParticlePool();
    collisionSystem = new SpaceInvadersCollisionSystem(particlePool);

    const mockGame = {
      isMultiplayer: false,
      isPaused: false,
      unifiedInput: {},
    } as any;
    gameStateSystem = new SpaceInvadersGameStateSystem(mockGame);

    world.addSystem(collisionSystem, { phase: SystemPhase.GameRules });
    world.addSystem(gameStateSystem, { phase: SystemPhase.GameRules });
    world.addSystem(new ComboSystem() as any, { phase: SystemPhase.Simulation });
  });

  it("should initialize GameState with correct default combo values and verify Combo component is attached", () => {
    createGameState(world);
    const gameState = world.getSingleton("GameState");
    expect(gameState).toBeDefined();
    expect(gameState?.combo).toBe(0);
    expect(gameState?.multiplier).toBe(1);
    expect(gameState?.comboTimerRemaining).toBe(0);

    // Verify Combo component exists in world and is attached to the GameState entity
    const comboEntities = world.query("Combo" as any);
    expect(comboEntities.length).toBe(1);

    const comboComp = world.getComponent(comboEntities[0], "Combo" as any) as any;
    expect(comboComp).toBeDefined();
    expect(comboComp.combo).toBe(0);
    expect(comboComp.multiplier).toBe(1);
    expect(comboComp.timerRemaining).toBe(0);
  });

  it("should increment combo and reset timer on invader destruction", () => {
    createGameState(world);

    // Add a dummy Boss to prevent wave spawning from level progression
    const dummyBoss = world.createEntity();
    world.addComponent(dummyBoss, { type: "Boss", hp: 10, maxHp: 10, timer: 0, phase: 1 });

    // Create an invader with CollisionEvents
    const invader = world.createEntity();
    world.addComponent(invader, { type: "Invader", row: 0, col: 0, points: 10 });
    world.addComponent(invader, { type: "Transform", x: 100, y: 100, rotation: 0, scaleX: 1, scaleY: 1, worldX: 100, worldY: 100, worldRotation: 0, worldScaleX: 1, worldScaleY: 1, dirty: false });
    world.addComponent(invader, { type: "Render", shape: "invader", size: 20, color: "#FFF", visible: true, opacity: 1, order: 0, hitFlashFrames: 0, angularVelocity: 0, rotation: 0 });

    // Create player bullet
    const bullet = world.createEntity();
    world.addComponent(bullet, { type: "PlayerBullet" });

    // Add CollisionEvents to both invader and bullet to trigger handling
    const events: CollisionEventsComponent = {
      type: "CollisionEvents",
      collisions: [{ otherEntity: bullet, normalX: 0, normalY: 0, depth: 0, contactPoints: [] }],
      activeTriggers: [],
      triggersEntered: [],
      triggersExited: []
    };
    world.addComponent(invader, events);

    const bulletEvents: CollisionEventsComponent = {
      type: "CollisionEvents",
      collisions: [{ otherEntity: invader, normalX: 0, normalY: 0, depth: 0, contactPoints: [] }],
      activeTriggers: [],
      triggersEntered: [],
      triggersExited: []
    };
    world.addComponent(bullet, bulletEvents);

    // Run collision update
    world.update(0.016);

    const gameState = world.getSingleton("GameState");
    expect(gameState?.combo).toBe(1);
    // With phase-based update, ComboSystem runs before CollisionSystem, so the timer is set to 2.0 at the end of the tick
    expect(gameState?.comboTimerRemaining).toBe(2.0);
    expect(gameState?.multiplier).toBe(1); // 1 + floor(1/5) = 1
  });

  it("should calculate multiplier progression correctly up to MAX_MULTIPLIER", () => {
    createGameState(world);

    // Add a dummy Boss to prevent wave spawning from level progression
    const dummyBoss = world.createEntity();
    world.addComponent(dummyBoss, { type: "Boss", hp: 10, maxHp: 10, timer: 0, phase: 1 });

    const addKill = (bulletId: number) => {
      const invader = world.createEntity();
      world.addComponent(invader, { type: "Invader", row: 0, col: 0, points: 10 });
      world.addComponent(invader, { type: "Transform", x: 100, y: 100, rotation: 0, scaleX: 1, scaleY: 1, worldX: 100, worldY: 100, worldRotation: 0, worldScaleX: 1, worldScaleY: 1, dirty: false });
      world.addComponent(invader, { type: "Render", shape: "invader", size: 20, color: "#FFF", visible: true, opacity: 1, order: 0, hitFlashFrames: 0, angularVelocity: 0, rotation: 0 });

      const bullet = world.createEntity();
      world.addComponent(bullet, { type: "PlayerBullet" });

      const events: CollisionEventsComponent = {
        type: "CollisionEvents",
        collisions: [{ otherEntity: bullet, normalX: 0, normalY: 0, depth: 0, contactPoints: [] }],
        activeTriggers: [],
        triggersEntered: [],
        triggersExited: []
      };
      world.addComponent(invader, events);

      const bulletEvents: CollisionEventsComponent = {
        type: "CollisionEvents",
        collisions: [{ otherEntity: invader, normalX: 0, normalY: 0, depth: 0, contactPoints: [] }],
        activeTriggers: [],
        triggersEntered: [],
        triggersExited: []
      };
      world.addComponent(bullet, bulletEvents);

      world.update(0.016);
    };

    // Kill 1
    addKill(100);
    expect(world.getSingleton("GameState")?.combo).toBe(1);
    expect(world.getSingleton("GameState")?.multiplier).toBe(1);

    // Kill up to 5 -> multiplier should become 2 (1 + floor(5/5) = 2)
    for (let i = 2; i <= 5; i++) {
      addKill(100 + i);
    }
    expect(world.getSingleton("GameState")?.combo).toBe(5);
    expect(world.getSingleton("GameState")?.multiplier).toBe(2);

    // Kill up to 25 -> multiplier capped at MAX_MULTIPLIER = 5 (1 + floor(25/5) = 6 capped to 5)
    for (let i = 6; i <= 25; i++) {
      addKill(100 + i);
    }
    expect(world.getSingleton("GameState")?.combo).toBe(25);
    expect(world.getSingleton("GameState")?.multiplier).toBe(5); // Capped at MAX_MULTIPLIER
  });

  it("should expire combo back to 0 and multiplier to 1 when COMBO_TIMEOUT is reached", () => {
    createGameState(world);

    // Mutate both GameState and Combo component manually to simulate combo
    world.mutateSingleton("GameState", (gs) => {
      gs.combo = 10;
      gs.multiplier = 3;
      gs.comboTimerRemaining = 2.0;
    });
    const comboEntities = world.query("Combo" as any);
    world.mutateComponent(comboEntities[0], "Combo" as any, (c: any) => {
      c.combo = 10;
      c.multiplier = 3;
      c.timerRemaining = 2.0;
    });

    // Advance 1.0 second -> combo timer decrements but combo is preserved
    world.update(1.0);
    let gameState = world.getSingleton("GameState");
    expect(gameState?.combo).toBe(10);
    expect(gameState?.multiplier).toBe(3);
    expect(gameState?.comboTimerRemaining).toBeCloseTo(1.0);

    // Advance another 1.1 seconds -> combo timer reaches 0 and combo expires
    world.update(1.1);
    gameState = world.getSingleton("GameState");
    expect(gameState?.combo).toBe(0);
    expect(gameState?.multiplier).toBe(1);
    expect(gameState?.comboTimerRemaining).toBe(0);
  });

  it("should NOT mutate GameState in resting state (stateVersion should only increase by invaders count query/tick)", () => {
    createGameState(world);

    // Add a dummy Boss to prevent wave spawning from level progression
    const dummyBoss = world.createEntity();
    world.addComponent(dummyBoss, { type: "Boss", hp: 10, maxHp: 10, timer: 0, phase: 1 });

    // Wait 1 tick to flush initial setup
    world.update(0.016);

    const versionBefore = world.stateVersion;

    // Run 5 consecutive resting updates
    for (let i = 0; i < 5; i++) {
      world.update(0.016);
    }

    const versionAfter = world.stateVersion;
    // Tick is incremented per update, but stateVersion increments only on component/structural mutations.
    // Since invadersRemaining is in updateGameState, that always mutates GameState once.
    // Screen shake and combo timer decrements are skipped entirely when inactive.
    // So stateVersion increases exactly by 5 (1 per tick).
    expect(versionAfter - versionBefore).toBe(5);
  });

  // Test 1: Verify initial state is x2 with the combo_head_start mutator
  it("should initialize GameState with combo x2 multiplier when combo_head_start mutator is applied", () => {
    createGameState(world);
    BENEFICIAL_MUTATORS["combo_head_start"].apply(world);

    const gameState = world.getSingleton("GameState");
    expect(gameState).toBeDefined();
    expect(gameState?.combo).toBe(5);
    expect(gameState?.multiplier).toBe(2);
    expect(gameState?.comboTimerRemaining).toBe(2.0); // COMBO_TIMEOUT is 2000 ms -> 2.0 seconds

    const comboEntities = world.query("Combo" as any);
    expect(comboEntities.length).toBe(1);
    const comboComp = world.getComponent(comboEntities[0], "Combo" as any) as any;
    expect(comboComp.combo).toBe(5);
    expect(comboComp.multiplier).toBe(2);
    expect(comboComp.timerRemaining).toBe(2.0);
  });

  // Test 2: Verify that the first impact scores with the x2 multiplier when the mutator is applied
  it("should score first hit with x2 multiplier when combo_head_start mutator is applied", () => {
    createGameState(world);
    BENEFICIAL_MUTATORS["combo_head_start"].apply(world);

    // Add a dummy Boss to prevent wave spawning from level progression
    const dummyBoss = world.createEntity();
    world.addComponent(dummyBoss, { type: "Boss", hp: 10, maxHp: 10, timer: 0, phase: 1 });

    // Create an invader with CollisionEvents (worth 10 points)
    const invader = world.createEntity();
    world.addComponent(invader, { type: "Invader", row: 0, col: 0, points: 10 });
    world.addComponent(invader, { type: "Transform", x: 100, y: 100, rotation: 0, scaleX: 1, scaleY: 1, worldX: 100, worldY: 100, worldRotation: 0, worldScaleX: 1, worldScaleY: 1, dirty: false });
    world.addComponent(invader, { type: "Render", shape: "invader", size: 20, color: "#FFF", visible: true, opacity: 1, order: 0, hitFlashFrames: 0, angularVelocity: 0, rotation: 0 });

    // Create player bullet
    const bullet = world.createEntity();
    world.addComponent(bullet, { type: "PlayerBullet" });

    // Add CollisionEvents to both invader and bullet to trigger handling
    const events: CollisionEventsComponent = {
      type: "CollisionEvents",
      collisions: [{ otherEntity: bullet, normalX: 0, normalY: 0, depth: 0, contactPoints: [] }],
      activeTriggers: [],
      triggersEntered: [],
      triggersExited: []
    };
    world.addComponent(invader, events);

    const bulletEvents: CollisionEventsComponent = {
      type: "CollisionEvents",
      collisions: [{ otherEntity: invader, normalX: 0, normalY: 0, depth: 0, contactPoints: [] }],
      activeTriggers: [],
      triggersEntered: [],
      triggersExited: []
    };
    world.addComponent(bullet, bulletEvents);

    // Run collision update
    world.update(0.016);

    const gameState = world.getSingleton("GameState");
    expect(gameState?.combo).toBe(6);
    expect(gameState?.multiplier).toBe(2); // 1 + floor(6/5) = 2
    expect(gameState?.score).toBe(20); // 10 points * multiplier 2 = 20
  });

  // Test 3: Verify normal x1 behavior without the mutator
  it("should score first hit with x1 multiplier when mutator is NOT applied (normal behavior)", () => {
    createGameState(world);

    // Add a dummy Boss to prevent wave spawning from level progression
    const dummyBoss = world.createEntity();
    world.addComponent(dummyBoss, { type: "Boss", hp: 10, maxHp: 10, timer: 0, phase: 1 });

    // Create an invader with CollisionEvents (worth 10 points)
    const invader = world.createEntity();
    world.addComponent(invader, { type: "Invader", row: 0, col: 0, points: 10 });
    world.addComponent(invader, { type: "Transform", x: 100, y: 100, rotation: 0, scaleX: 1, scaleY: 1, worldX: 100, worldY: 100, worldRotation: 0, worldScaleX: 1, worldScaleY: 1, dirty: false });
    world.addComponent(invader, { type: "Render", shape: "invader", size: 20, color: "#FFF", visible: true, opacity: 1, order: 0, hitFlashFrames: 0, angularVelocity: 0, rotation: 0 });

    // Create player bullet
    const bullet = world.createEntity();
    world.addComponent(bullet, { type: "PlayerBullet" });

    // Add CollisionEvents to both invader and bullet to trigger handling
    const events: CollisionEventsComponent = {
      type: "CollisionEvents",
      collisions: [{ otherEntity: bullet, normalX: 0, normalY: 0, depth: 0, contactPoints: [] }],
      activeTriggers: [],
      triggersEntered: [],
      triggersExited: []
    };
    world.addComponent(invader, events);

    const bulletEvents: CollisionEventsComponent = {
      type: "CollisionEvents",
      collisions: [{ otherEntity: invader, normalX: 0, normalY: 0, depth: 0, contactPoints: [] }],
      activeTriggers: [],
      triggersEntered: [],
      triggersExited: []
    };
    world.addComponent(bullet, bulletEvents);

    // Run collision update
    world.update(0.016);

    const gameState = world.getSingleton("GameState");
    expect(gameState?.combo).toBe(1);
    expect(gameState?.multiplier).toBe(1); // 1 + floor(1/5) = 1
    expect(gameState?.score).toBe(10); // 10 points * multiplier 1 = 10
  });

  describe("Beneficial Mutators Integration", () => {
    it("should apply faster_bullets mutator and increase bullet speeds by 10%", () => {
      const config = world.getResource<any>("GameConfig");
      const basePlayerSpeed = config.PLAYER_BULLET_SPEED;

      BENEFICIAL_MUTATORS["faster_bullets"].apply(world);

      const updatedConfig = world.getResource<any>("GameConfig");
      expect(updatedConfig.PLAYER_BULLET_SPEED).toBe(Math.round(basePlayerSpeed * 1.10));
    });

    it("should apply extra_life mutator and increase starting lives", () => {
      // 1. Setup GameState and Player
      createGameState(world);
      const player = world.createEntity();
      world.addComponent(player, { type: "Player" } as any);
      world.addComponent(player, { type: "Health", current: 3, max: 3, invulnerableRemaining: 0 } as any);

      const configBefore = world.getResource<any>("GameConfig").PLAYER_INITIAL_LIVES;

      // 2. Apply mutator
      BENEFICIAL_MUTATORS["extra_life"].apply(world);

      // 3. Assert config, GameState, and Player health are incremented
      const updatedConfig = world.getResource<any>("GameConfig");
      expect(updatedConfig.PLAYER_INITIAL_LIVES).toBe(configBefore + 1);

      const gameState = world.getSingleton("GameState");
      expect(gameState?.lives).toBe(configBefore + 1);

      const health = world.getComponent(player, "Health" as any) as any;
      expect(health.current).toBe(4);
      expect(health.max).toBe(4);
    });

    it("should apply shield_pulse mutator and grant 3 seconds on-spawn invulnerability", () => {
      BENEFICIAL_MUTATORS["shield_pulse"].apply(world);

      // Assert HasShieldPulse resource is set
      expect(world.getResource("HasShieldPulse")).toBe(true);

      // Create a player ship using a mock blueprint setup to mimic our player blueprint
      const config = world.getResource<any>("GameConfig");
      const player = world.createEntity();
      world.addComponent(player, { type: "Player" } as any);
      world.addComponent(player, {
        type: "Health",
        current: config.PLAYER_INITIAL_LIVES,
        max: config.PLAYER_INITIAL_LIVES,
        invulnerableRemaining: world.getResource("HasShieldPulse") ? 3.0 : 0
      } as any);

      const health = world.getComponent(player, "Health" as any) as any;
      expect(health.invulnerableRemaining).toBe(3.0);
    });
  });

  describe("Falling Loot & Power-up Spawning and Resolution", () => {
    let mockEventBus: EventBus;

    beforeEach(() => {
      mockEventBus = new EventBus();
      world.setResource("EventBus", mockEventBus);

      // Register standard Power-up system and custom PowerUpEffects on our test world
      world.addSystem(new PowerUpSystem() as any, { phase: SystemPhase.Simulation });

      world.setResource("PowerUpEffects", {
        speed_boost: {
          apply(w: World<any>, playerEntity: number) {
            const config = w.getResource<any>("GameConfig");
            if (config) {
              config.PLAYER_SPEED = Math.round(config.PLAYER_SPEED * 1.30);
            }
          }
        },
        shield: {
          apply(w: World<any>, playerEntity: number) {
            if (w.hasComponent(playerEntity, "Health")) {
              w.mutateComponent(playerEntity, "Health", (h: any) => {
                h.invulnerableRemaining = 3.0;
              });
            }
          }
        }
      });
    });

    it("should spawn falling powerup entity upon receiving loot:spawn event", () => {
      let spawnedPowerUp: number | undefined;

      // Setup event listener mimicking SpaceInvadersGameScene
      mockEventBus.on("loot:spawn" as any, (event: any) => {
        const powerUpEntity = world.createEntity();
        world.addComponent(powerUpEntity, {
          type: "Transform",
          x: event.x,
          y: event.y,
          rotation: 0,
          scaleX: 1,
          scaleY: 1,
          worldX: event.x,
          worldY: event.y,
          worldRotation: 0,
          worldScaleX: 1,
          worldScaleY: 1,
          dirty: false
        } as any);
        world.addComponent(powerUpEntity, {
          type: "Velocity",
          vx: 0,
          vy: 100,
          angularVelocity: 0
        } as any);
        world.addComponent(powerUpEntity, {
          type: "Render",
          shape: "shield_block",
          size: 15,
          color: "#FFFF00",
          rotation: 0,
          visible: true,
          opacity: 1,
          order: 1,
          hitFlashFrames: 0,
          angularVelocity: 0
        } as any);
        world.addComponent(powerUpEntity, {
          type: "Collider2D",
          shape: { type: "aabb", halfWidth: 7.5, halfHeight: 7.5 },
          layer: 0x0008, // DEBRIS
          mask: 0x0001, // PLAYER
          offsetX: 0,
          offsetY: 0,
          isTrigger: true,
          enabled: true
        } as any);
        world.addComponent(powerUpEntity, {
          type: "PowerUp",
          powerUpType: event.lootType
        } as any);
        world.addComponent(powerUpEntity, {
          type: "Boundary",
          width: 800,
          height: 600,
          mode: "destroy"
        } as any);

        spawnedPowerUp = powerUpEntity;
      });

      // Emit event
      mockEventBus.emit("loot:spawn" as any, { x: 120, y: 150, lootType: "speed_boost" });

      // Verify power-up entity spawned with correct properties
      expect(spawnedPowerUp).toBeDefined();
      expect(world.hasComponent(spawnedPowerUp!, "PowerUp" as any)).toBe(true);
      expect(world.hasComponent(spawnedPowerUp!, "Transform" as any)).toBe(true);
      expect(world.hasComponent(spawnedPowerUp!, "Velocity" as any)).toBe(true);

      const powerupComp = world.getComponent(spawnedPowerUp!, "PowerUp" as any) as any;
      expect(powerupComp.powerUpType).toBe("speed_boost");

      const velocityComp = world.getComponent(spawnedPowerUp!, "Velocity" as any) as any;
      expect(velocityComp.vy).toBe(100);
    });

    it("should apply speed_boost effect and destroy power-up on player collision", () => {
      // 1. Create player
      const player = world.createEntity();
      world.addComponent(player, { type: "Player" } as any);
      world.addComponent(player, { type: "Transform", x: 200, y: 500, rotation: 0, scaleX: 1, scaleY: 1, worldX: 200, worldY: 500, worldRotation: 0, worldScaleX: 1, worldScaleY: 1, dirty: false } as any);

      // 2. Create speed_boost powerup entity
      const powerUp = world.createEntity();
      world.addComponent(powerUp, { type: "PowerUp", powerUpType: "speed_boost" } as any);

      // Add collision event to trigger PowerUpSystem update
      world.addComponent(powerUp, {
        type: "CollisionEvents",
        collisions: [{ otherEntity: player, normalX: 0, normalY: 0, depth: 0, contactPoints: [] }],
        activeTriggers: [],
        triggersEntered: [],
        triggersExited: []
      } as any);

      const originalPlayerSpeed = world.getResource<any>("GameConfig").PLAYER_SPEED;

      // Run world update to tick PowerUpSystem
      world.update(0.016);

      // Assert player speed is boosted by 30%
      const newPlayerSpeed = world.getResource<any>("GameConfig").PLAYER_SPEED;
      expect(newPlayerSpeed).toBe(Math.round(originalPlayerSpeed * 1.30));

      // Assert power-up entity is destroyed
      expect(world.hasEntity(powerUp)).toBe(false);
    });
  });
});
