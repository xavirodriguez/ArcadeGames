import { World, SystemPhase, CollisionEventsComponent, HealthComponent, EventBus, TransformComponent, RenderComponent, Entity } from "@tiny-aster/core";
import { SpaceInvadersCollisionSystem } from "../systems/SpaceInvadersCollisionSystem";
import { KamikazeSystem } from "../systems/KamikazeSystem";
import { CombatSystem } from "@tiny-aster/gameplay-kit";
import { SpaceInvadersComponentRegistry } from "../types/SpaceInvadersTypes";
import { ParticlePool, EnemyBulletPool, PlayerBulletPool } from "../EntityPool";

describe("Space Invaders Pilot Combat Integration", () => {
  let world: World<SpaceInvadersComponentRegistry>;
  let particlePool: ParticlePool;
  let playerBulletPool: PlayerBulletPool;
  let enemyBulletPool: EnemyBulletPool;

  beforeEach(() => {
    world = new World<SpaceInvadersComponentRegistry>();

    const eventBus = new EventBus<any>();
    world.setResource("EventBus", eventBus);

    const mockConfig = {
      KEYS: { LEFT: "ArrowLeft", RIGHT: "ArrowRight", SHOOT: "Space" },
      PLAYER_INITIAL_LIVES: 3,
      PLAYER_BULLET_SPEED: 500,
      PLAYER_BULLET_SIZE: 4,
      PLAYER_BULLET_TTL: 2000,
      ENEMY_BULLET_SPEED: 250,
      ENEMY_BULLET_SIZE: 4,
      ENEMY_BULLET_TTL: 3000,
      PARTICLE_COUNT: 8,
      COMBO_TIMEOUT: 2000,
      MAX_MULTIPLIER: 5,
    };
    world.setResource("GameConfig", mockConfig);

    particlePool = new ParticlePool();
    playerBulletPool = new PlayerBulletPool();
    enemyBulletPool = new EnemyBulletPool();

    world.setResource("ParticlePool", particlePool);
    world.setResource("PlayerBulletPool", playerBulletPool);
    world.setResource("EnemyBulletPool", enemyBulletPool);

    // Register systems
    world.addSystem(new CombatSystem(), { phase: SystemPhase.Collision });
    world.addSystem(new SpaceInvadersCollisionSystem(particlePool), { phase: SystemPhase.GameRules });
  });

  it("should damage player when hit by enemy bullet and update lives & invulnerability", () => {
    // 1. Create GameState
    const stateEntity = world.createEntity();
    world.addComponent(stateEntity, {
      type: "GameState",
      lives: 3,
      score: 0,
      level: 1,
      invadersRemaining: 0,
      isGameOver: false,
      screenShake: null,
      kamikazesActive: 0,
    } as any);

    // 2. Create Player
    const player = world.createEntity();
    world.addComponent(player, { type: "Player" } as any);
    world.addComponent(player, { type: "Transform", x: 100, y: 100 } as any);
    world.addComponent(player, { type: "Render", hitFlashFrames: 0, visible: true, opacity: 1, order: 0 } as any);
    world.addComponent(player, { type: "Health", current: 3, max: 3, invulnerableRemaining: 0 } as any);
    world.addComponent(player, { type: "Faction", faction: "player", value: "player" } as any);

    // 3. Acquire enemy bullet from pool near player
    const bullet = enemyBulletPool.acquire(world, {
      x: 100,
      y: 100,
      dx: 0,
      dy: 100,
      size: 4,
      color: "red",
      ttl: 2000
    });

    // 4. Trigger mock collision
    world.addComponent(player, {
      type: "CollisionEvents",
      collisions: [{ otherEntity: bullet, normalX: 0, normalY: 0, depth: 0, contactPoints: [] }],
      activeTriggers: [], triggersEntered: [], triggersExited: []
    } as any);
    world.addComponent(bullet, {
      type: "CollisionEvents",
      collisions: [{ otherEntity: player, normalX: 0, normalY: 0, depth: 0, contactPoints: [] }],
      activeTriggers: [], triggersEntered: [], triggersExited: []
    } as any);

    // Execute update tick
    world.update(0.016);
    world.gameplayRandom.unlock();
    try {
      world.getEventBus()?.flushDeferred();
    } finally {
      world.gameplayRandom.lock();
    }

    // Check Player health is decremented
    const health = world.getComponent(player, "Health");
    expect(health?.current).toBe(2);
    expect(health?.invulnerableRemaining).toBe(1.5);

    // Check GameState lives is synchronized and screenshake applied
    const state = world.getComponent(stateEntity, "GameState" as any) as any;
    expect(state.lives).toBe(2);
    expect(state.screenShake).toEqual({ intensity: 10, duration: 0.3, elapsed: 0, totalDuration: 0.3 });

    // Check player bullet hit flash
    const render = world.getComponent(player, "Render");
    expect(render?.hitFlashFrames).toBe(10);
  });

  it("should damage boss when hit by player bullet and trigger particle explosion", () => {
    // 1. Create GameState
    const stateEntity = world.createEntity();
    world.addComponent(stateEntity, {
      type: "GameState",
      lives: 3,
      score: 0,
      level: 1,
      invadersRemaining: 0,
      isGameOver: false,
      screenShake: null,
      kamikazesActive: 0,
    } as any);

    // 2. Create Boss
    const boss = world.createEntity();
    world.addComponent(boss, { type: "Boss", hp: 10, maxHp: 10, timer: 0, phase: 1 } as any);
    world.addComponent(boss, { type: "Transform", x: 200, y: 100 } as any);
    world.addComponent(boss, { type: "Render", hitFlashFrames: 0, visible: true, opacity: 1, order: 0 } as any);
    world.addComponent(boss, { type: "Health", current: 10, max: 10 } as any);
    world.addComponent(boss, { type: "Faction", faction: "enemy", value: "enemy" } as any);

    // 3. Acquire player bullet near boss
    const bullet = playerBulletPool.acquire(world, {
      x: 200,
      y: 100,
      dx: 0,
      dy: -100,
      size: 4,
      color: "green",
      ttl: 2000
    });

    // 4. Trigger collision events
    world.addComponent(boss, {
      type: "CollisionEvents",
      collisions: [{ otherEntity: bullet, normalX: 0, normalY: 0, depth: 0, contactPoints: [] }],
      activeTriggers: [], triggersEntered: [], triggersExited: []
    } as any);
    world.addComponent(bullet, {
      type: "CollisionEvents",
      collisions: [{ otherEntity: boss, normalX: 0, normalY: 0, depth: 0, contactPoints: [] }],
      activeTriggers: [], triggersEntered: [], triggersExited: []
    } as any);

    // Execute update tick
    world.update(0.016);
    world.gameplayRandom.unlock();
    try {
      world.getEventBus()?.flushDeferred();
    } finally {
      world.gameplayRandom.lock();
    }

    // Check boss health is decremented
    const health = world.getComponent(boss, "Health");
    expect(health?.current).toBe(9);

    // Check Boss hp is synchronized
    const bossComp = world.getComponent(boss, "Boss" as any) as any;
    expect(bossComp.hp).toBe(9);

    // Check score is incremented
    const state = world.getComponent(stateEntity, "GameState" as any) as any;
    expect(state.score).toBe(100);

    // Check particles were created
    const particles = world.query("Reclaimable" as any);
    expect(particles.length).toBeGreaterThan(0);
  });

  it("should supercharge player bullet when hitting shield, allowing it to pierce 1 invader", () => {
    // 0. Create GameState
    const stateEntity = world.createEntity();
    world.addComponent(stateEntity, {
      type: "GameState",
      lives: 3,
      score: 0,
      level: 1,
      invadersRemaining: 0,
      isGameOver: false,
      screenShake: null,
      kamikazesActive: 0,
      readyRemaining: 0,
      intermissionRemaining: 0,
      continueCountdownRemaining: 0,
      continuesRemaining: 3
    });

    // 1. Create Shield segment
    const shield = world.createEntity();
    world.addComponent(shield, { type: "Shield", hp: 3, maxHp: 3 });
    world.addComponent(shield, {
      type: "Transform", x: 100, y: 300, rotation: 0, scaleX: 1, scaleY: 1,
      worldX: 100, worldY: 300, worldRotation: 0, worldScaleX: 1, worldScaleY: 1, dirty: false
    });

    // 2. Acquire PlayerBullet with consumption = "destroy-entity"
    const bullet = playerBulletPool.acquire(world, {
      x: 100,
      y: 300,
      dx: 0,
      dy: -500,
      size: 4,
      color: "#00FF00",
      ttl: 2000
    });

    // Verify initial bullet damage consumption
    const initialDamage = world.getComponent(bullet, "Damage");
    expect(initialDamage?.consumption).toBe("destroy-entity");

    // 3. Trigger bullet <-> shield collision
    world.addComponent(shield, {
      type: "CollisionEvents",
      collisions: [{ otherEntity: bullet, normalX: 0, normalY: 0, depth: 0, contactPoints: [] }],
      activeTriggers: [], triggersEntered: [], triggersExited: []
    });
    world.addComponent(bullet, {
      type: "CollisionEvents",
      collisions: [{ otherEntity: shield, normalX: 0, normalY: 0, depth: 0, contactPoints: [] }],
      activeTriggers: [], triggersEntered: [], triggersExited: []
    });

    world.update(0.016);

    // Check (a): Shield lost 1 HP
    const shieldComp = world.getComponent(shield, "Shield");
    expect(shieldComp?.hp).toBe(2);

    // Check (b): Bullet survived and consumption changed to "remove-component", color updated to colors.cyan (#00D9FF)
    const chargedDamage = world.getComponent(bullet, "Damage");
    expect(chargedDamage?.consumption).toBe("remove-component");
    const bulletRender = world.getComponent(bullet, "Render");
    expect(bulletRender?.color).toBe("#00D9FF");

    // Clear collision events on bullet
    world.mutateComponent(bullet, "CollisionEvents", (ce) => {
      ce.collisions = [];
    });

    // 4. Create Invader 1
    const invader1 = world.createEntity();
    world.addComponent(invader1, { type: "Invader", row: 0, col: 0, points: 30 });
    world.addComponent(invader1, { type: "Health", current: 1, max: 1 });
    world.addComponent(invader1, { type: "Faction", faction: "enemy", value: "enemy" });
    world.addComponent(invader1, {
      type: "Transform", x: 100, y: 200, rotation: 0, scaleX: 1, scaleY: 1,
      worldX: 100, worldY: 200, worldRotation: 0, worldScaleX: 1, worldScaleY: 1, dirty: false
    });
    world.addComponent(invader1, {
      type: "Render", shape: "invader", size: 15, color: "#FFFFFF", rotation: 0,
      visible: true, opacity: 1, order: 0, hitFlashFrames: 0, angularVelocity: 0
    });

    // Trigger bullet <-> invader1 collision
    world.addComponent(invader1, {
      type: "CollisionEvents",
      collisions: [{ otherEntity: bullet, normalX: 0, normalY: 0, depth: 0, contactPoints: [] }],
      activeTriggers: [], triggersEntered: [], triggersExited: []
    });
    world.mutateComponent(bullet, "CollisionEvents", (ce) => {
      ce.collisions = [{ otherEntity: invader1, normalX: 0, normalY: 0, depth: 0, contactPoints: [] }];
    });

    world.update(0.016);

    // Check (c) & (d): Invader 1 was hit and destroyed, bullet survived, but bullet's Damage component was removed by CombatSystem
    expect(world.hasComponent(invader1, "Health")).toBe(false);
    expect(world.hasComponent(bullet, "Damage")).toBe(false);

    // Clear collision events on bullet
    world.mutateComponent(bullet, "CollisionEvents", (ce) => {
      ce.collisions = [];
    });

    // 5. Create Invader 2
    const invader2 = world.createEntity();
    world.addComponent(invader2, { type: "Invader", row: 0, col: 1, points: 30 });
    world.addComponent(invader2, { type: "Health", current: 1, max: 1 });
    world.addComponent(invader2, { type: "Faction", faction: "enemy", value: "enemy" });
    world.addComponent(invader2, {
      type: "Transform", x: 100, y: 100, rotation: 0, scaleX: 1, scaleY: 1,
      worldX: 100, worldY: 100, worldRotation: 0, worldScaleX: 1, worldScaleY: 1, dirty: false
    });

    // Trigger bullet <-> invader2 collision
    world.addComponent(invader2, {
      type: "CollisionEvents",
      collisions: [{ otherEntity: bullet, normalX: 0, normalY: 0, depth: 0, contactPoints: [] }],
      activeTriggers: [], triggersEntered: [], triggersExited: []
    });
    world.mutateComponent(bullet, "CollisionEvents", (ce) => {
      ce.collisions = [{ otherEntity: invader2, normalX: 0, normalY: 0, depth: 0, contactPoints: [] }];
    });

    world.update(0.016);

    // Check (e): Invader 2 was NOT damaged because bullet lost its Damage component after hitting invader 1
    const invader2Health = world.getComponent(invader2, "Health");
    expect(invader2Health?.current).toBe(1);
  });

  it("should handle kamikaze warning phase before diving", () => {
    const kamikazeSystem = new KamikazeSystem();
    world.addSystem(kamikazeSystem, { phase: SystemPhase.GameRules });

    // 1. Create GameState
    const stateEntity = world.createEntity();
    world.addComponent(stateEntity, {
      type: "GameState",
      lives: 3,
      score: 0,
      level: 1,
      invadersRemaining: 1,
      isGameOver: false,
      screenShake: null,
      kamikazesActive: 1,
      readyRemaining: 0,
      intermissionRemaining: 0,
      continueCountdownRemaining: 0,
      continuesRemaining: 3
    });

    // 2. Create Player
    const player = world.createEntity();
    world.addComponent(player, { type: "Player" });
    world.addComponent(player, {
      type: "Transform", x: 400, y: 500, rotation: 0, scaleX: 1, scaleY: 1,
      worldX: 400, worldY: 500, worldRotation: 0, worldScaleX: 1, worldScaleY: 1, dirty: false
    });

    // 3. Create Kamikaze in warning phase
    const kamikaze = world.createEntity();
    world.addComponent(kamikaze, { type: "Invader", row: 0, col: 0, points: 30 });
    world.addComponent(kamikaze, {
      type: "Transform", x: 200, y: 100, rotation: 0, scaleX: 1, scaleY: 1,
      worldX: 200, worldY: 100, worldRotation: 0, worldScaleX: 1, worldScaleY: 1, dirty: false
    });
    world.addComponent(kamikaze, { type: "Velocity", vx: 0, vy: 0, angularVelocity: 0 });
    world.addComponent(kamikaze, {
      type: "Render", shape: "invader", size: 15, color: "#FF4444", rotation: 0,
      visible: true, opacity: 1, order: 0, hitFlashFrames: 0, angularVelocity: 0
    });
    world.addComponent(kamikaze, {
      type: "Kamikaze",
      variant: "standard",
      phase: "warning",
      warningRemaining: 0.5,
      originX: 200,
      originY: 100,
      diveSpeed: 180,
    });

    // Tick 1: 0.2s elapsed -> warning remaining = 0.3s, phase stays warning, position unchanged
    world.update(0.2);
    let kamiComp = world.getComponent(kamikaze, "Kamikaze");
    let posComp = world.getComponent(kamikaze, "Transform");
    let velComp = world.getComponent(kamikaze, "Velocity");

    expect(kamiComp?.phase).toBe("warning");
    expect(kamiComp?.warningRemaining).toBeCloseTo(0.3);
    expect(posComp?.x).toBe(200);
    expect(posComp?.y).toBe(100);
    expect(velComp?.vx).toBe(0);
    expect(velComp?.vy).toBe(0);

    // Tick 2: 0.35s elapsed -> warning remaining reaches 0 -> transitions to diving
    world.update(0.35);
    kamiComp = world.getComponent(kamikaze, "Kamikaze");
    expect(kamiComp?.phase).toBe("diving");
    expect(kamiComp?.warningRemaining).toBe(0);

    // Tick 3: 0.016s elapsed during diving phase -> calculates homing velocity
    world.update(0.016);
    velComp = world.getComponent(kamikaze, "Velocity");
    expect(velComp?.vy).toBeGreaterThan(0); // Active dive velocity homing towards player
  });
});
