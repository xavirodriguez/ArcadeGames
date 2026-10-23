import { VerticalShmupGame } from "../VerticalShmupGame";
import { resolveViewportDimensions } from "@tiny-aster/core";
import { createEnemyBullet } from "../EntityFactory";
import type { EnemyBulletPool, PlayerBulletPool } from "../EntityPool";
import type { ShmupConfig } from "../types/ShmupConfigSchema";

describe("Vertical Shmup simulation contracts (P0)", () => {
  const games: VerticalShmupGame[] = [];

  afterEach(() => {
    for (const game of games.splice(0)) {
      game.destroy();
    }
  });

  async function createGame(): Promise<VerticalShmupGame> {
    const game = new VerticalShmupGame({ headless: true, manualLoop: true });
    games.push(game);
    await game.init();
    // Register event subscriptions (notably combat:hit) before an integration
    // test starts creating collisions. A zero-delta tick leaves gameplay time unchanged.
    game.update(0);
    return game;
  }

  function requirePlayer(game: VerticalShmupGame): number {
    const player = game.world.query("ShmupPlayer", "Input", "Transform", "Velocity")[0];
    if (player === undefined) {
      throw new Error("Expected initialized vertical-shmup player");
    }
    return player;
  }

  async function resolveEnemyBulletAtOffset(offsetX: number): Promise<{
    collisionRecorded: boolean;
    healthBefore: number;
    healthAfter: number;
    projectileAlive: boolean;
  }> {
    const game = await createGame();
    const world = game.world;
    const player = requirePlayer(game);
    const config = world.getResource<ShmupConfig>("GameConfig");
    const pool = world.getResource<EnemyBulletPool>("EnemyBulletPool");
    const playerTransform = world.getMutableComponent(player, "Transform");
    const playerHealth = world.getComponent(player, "Health");
    if (!config || !pool || !playerTransform || !playerHealth) {
      throw new Error("Expected player transform, health, game configuration, and enemy projectile pool");
    }

    playerTransform.x = config.WORLD_WIDTH / 2;
    playerTransform.y = config.WORLD_HEIGHT / 2;
    playerTransform.dirty = true;

    const projectile = createEnemyBullet(
      world,
      playerTransform.x + offsetX,
      playerTransform.y,
      0,
      0,
      pool
    );
    const healthBefore = playerHealth.current;
    game.update(0);

    const collisions = world.getComponent(player, "CollisionEvents")?.collisions ?? [];
    const healthAfter = world.getComponent(player, "Health")?.current ?? healthBefore;
    return {
      collisionRecorded: collisions.some((collision) => collision.otherEntity === projectile),
      healthBefore,
      healthAfter,
      projectileAlive: world.isAlive(projectile)
    };
  }

  it("adapts the flat keyboard payload and preserves partial state updates", async () => {
    const game = await createGame();
    const player = requirePlayer(game);
    game.setInputState({ moveX: 1, moveY: -1, shoot: true });
    game.update(0);

    const velocity = game.world.getComponent(player, "Velocity");
    const input = game.world.getComponent(player, "Input");
    if (!velocity || !input) throw new Error("Expected player movement and input state");
    expect(Math.hypot(velocity.vx, velocity.vy)).toBeCloseTo(300, 8);
    expect(input.actions).toContain("shoot");

    game.setInputState({ shoot: false });
    game.update(0);
    const inputAfterRelease = game.world.getComponent(player, "Input");
    if (!inputAfterRelease) throw new Error("Expected player input after key release");
    expect(inputAfterRelease.actions).not.toContain("shoot");
    expect(inputAfterRelease.axes.moveX).toBe(1);
    expect(inputAfterRelease.axes.moveY).toBe(-1);
  });

  it("exposes the vertical world dimensions to the renderer viewport contract", async () => {
    const game = await createGame();
    const config = game.world.getResource<ShmupConfig & { worldWidth?: number; worldHeight?: number }>("GameConfig");
    if (!config) throw new Error("Expected renderer and gameplay configuration");
    expect(resolveViewportDimensions(config)).toEqual({
      viewportWidth: config.WORLD_WIDTH,
      viewportHeight: config.WORLD_HEIGHT
    });
  });

  it("normalizes diagonal input so total speed never exceeds PLAYER_SPEED", async () => {
    const game = await createGame();
    const world = game.world;
    const player = requirePlayer(game);

    game.setInputState({ axes: { moveX: 1, moveY: -1 } });
    game.update(0);

    const velocity = world.getComponent(player, "Velocity");
    const config = world.getResource<ShmupConfig>("GameConfig");
    if (!velocity || !config) throw new Error("Expected player velocity and game configuration");

    expect(Math.hypot(velocity.vx, velocity.vy)).toBeCloseTo(config.PLAYER_SPEED, 8);
    expect(Math.abs(velocity.vx)).toBeCloseTo(config.PLAYER_SPEED / Math.sqrt(2), 8);
    expect(Math.abs(velocity.vy)).toBeCloseTo(config.PLAYER_SPEED / Math.sqrt(2), 8);
  });

  it("travels the same distance for 30 FPS, 60 FPS, and irregular time steps", async () => {
    const runForOneSecond = async (steps: number[]): Promise<number> => {
      const game = await createGame();
      const world = game.world;
      const player = requirePlayer(game);
      const start = world.getComponent(player, "Transform");
      if (!start) throw new Error("Expected player transform");
      const startY = start.y;

      game.setInputState({ axes: { moveX: 0, moveY: -1 } });
      for (const deltaTime of steps) game.update(deltaTime);

      const end = world.getComponent(player, "Transform");
      if (!end) throw new Error("Expected player transform after simulation");
      return startY - end.y;
    };

    const distanceAt30Fps = await runForOneSecond(Array.from({ length: 30 }, () => 1 / 30));
    const distanceAt60Fps = await runForOneSecond(Array.from({ length: 60 }, () => 1 / 60));
    const distanceAtIrregularSteps = await runForOneSecond([0.07, 0.13, 0.21, 0.09, 0.16, 0.14, 0.2]);

    expect(distanceAt30Fps).toBeCloseTo(300, 6);
    expect(distanceAt60Fps).toBeCloseTo(300, 6);
    expect(distanceAtIrregularSteps).toBeCloseTo(300, 6);
  });

  it("clamps the player to the exact playfield edge after movement integration", async () => {
    const game = await createGame();
    const world = game.world;
    const player = requirePlayer(game);
    const config = world.getResource<ShmupConfig>("GameConfig");
    const transform = world.getMutableComponent(player, "Transform");
    if (!config || !transform) throw new Error("Expected player transform and game configuration");

    const maxX = config.WORLD_WIDTH - config.PLAYER_SIZE;
    transform.x = maxX - 1;
    transform.dirty = true;
    game.setInputState({ axes: { moveX: 1, moveY: 0 } });
    game.update(1 / 60);

    const finalTransform = world.getComponent(player, "Transform");
    const finalVelocity = world.getComponent(player, "Velocity");
    if (!finalTransform || !finalVelocity) throw new Error("Expected player state after movement");

    expect(finalTransform.x).toBe(maxX);
    expect(finalVelocity.vx).toBe(0);
  });

  it("uses a small circular vulnerability hitbox independent of the sprite size", async () => {
    const game = await createGame();
    const world = game.world;
    const player = requirePlayer(game);
    const collider = world.getComponent(player, "Collider");
    if (!collider) throw new Error("Expected player collider");

    expect(collider.shape).toMatchObject({ radius: 2.5 });
  });

  it("ignores enemy bullet overlaps with the sprite exterior but outside the hitbox", async () => {
    const result = await resolveEnemyBulletAtOffset(8);

    expect(result.collisionRecorded).toBe(false);
    expect(result.healthAfter).toBe(result.healthBefore);
    expect(result.projectileAlive).toBe(true);
  });

  it("records a collision and damages the player when an enemy bullet intersects the hitbox", async () => {
    const result = await resolveEnemyBulletAtOffset(5);

    expect(result.collisionRecorded).toBe(true);
    expect(result.healthAfter).toBeLessThan(result.healthBefore);
    expect(result.projectileAlive).toBe(false);
  });

  it("uses seeded gameplay randomness for enemy pattern cooldowns", async () => {
    const createSeededGame = async (): Promise<VerticalShmupGame> => {
      const game = new VerticalShmupGame({ headless: true, manualLoop: true, gameOptions: { seed: 731 } });
      games.push(game);
      await game.init();
      return game;
    };

    const firstGame = await createSeededGame();
    const secondGame = await createSeededGame();
    const firstEnemy = createEnemy(firstGame.world, 100, 100, "straight", 1);
    const secondEnemy = createEnemy(secondGame.world, 100, 100, "straight", 1);
    const firstPattern = firstGame.world.getComponent(firstEnemy, "BulletPattern");
    const secondPattern = secondGame.world.getComponent(secondEnemy, "BulletPattern");

    expect(firstPattern?.cooldownRemaining).toBe(secondPattern?.cooldownRemaining);
    expect(firstPattern?.cooldownRemaining).toBeGreaterThanOrEqual(0.8);
    expect(firstPattern?.cooldownRemaining).toBeLessThan(1.3);
  });

  it("limits a player to one enemy-projectile hit per simulation tick", async () => {
    const game = await createGame();
    const world = game.world;
    const player = requirePlayer(game);
    const config = world.getResource<ShmupConfig>("GameConfig");
    const pool = world.getResource<EnemyBulletPool>("EnemyBulletPool");
    const transform = world.getMutableComponent(player, "Transform");
    if (!config || !pool || !transform) throw new Error("Expected player and game configuration");

    transform.x = config.WORLD_WIDTH / 2;
    transform.y = config.WORLD_HEIGHT / 2;
    transform.dirty = true;
    createEnemyBullet(world, transform.x, transform.y, 0, 0, pool);
    createEnemyBullet(world, transform.x + 1, transform.y, 0, 0, pool);

    game.update(0);

    expect(world.getComponent(player, "Health")?.current).toBe(2);
    expect(world.getComponent(player, "Health")?.invulnerableRemaining).toBe(1.5);
  });

  it("does not repeat death effects or allow movement after Game Over", async () => {
    const game = await createGame();
    const world = game.world;
    const player = requirePlayer(game);
    world.mutateComponent(player, "Health", health => {
      health.current = 0;
    });
    game.setInputState({ moveX: 1, moveY: -1, shoot: true });
    game.update(0);

    expect(game.getGameState().isGameOver).toBe(true);
    const entityCountAfterDeath = world.entities.length;

    game.update(0);
    expect(world.entities.length).toBe(entityCountAfterDeath);
    expect(world.getComponent(player, "Velocity")).toMatchObject({ vx: 0, vy: 0 });
  });

  it("fires on the 150 ms cadence without losing elapsed time at variable frame rates", async () => {
    const runForOneSecond = async (steps: number[]): Promise<number> => {
      const game = await createGame();
      const world = game.world;
      const config = world.getResource<ShmupConfig>("GameConfig");
      const playerPool = world.getResource<PlayerBulletPool>("PlayerBulletPool");
      if (!config || !playerPool) throw new Error("Expected game configuration and player bullet pool");
      const acquireBullet = jest.spyOn(playerPool, "acquireBullet");
      world.setResource("GameConfig", {
        ...config,
        PLAYER_SHOOT_COOLDOWN: 150,
        SPAWN_INTERVAL: 100
      });
      // Isolate cadence from projectile consumption caused by test-enemy overlaps.
      for (const enemy of world.query("ShmupEnemy", "Collider")) {
        world.mutateComponent(enemy, "Collider", collider => {
          collider.enabled = false;
        });
      }
      game.setInputState({ actions: ["shoot"] });

      for (const deltaTime of steps) game.update(deltaTime);
      return acquireBullet.mock.calls.length;
    };

    const at60Fps = await runForOneSecond(Array.from({ length: 60 }, () => 1 / 60));
    const atIrregularSteps = await runForOneSecond([0.07, 0.13, 0.21, 0.09, 0.16, 0.14, 0.2]);

    expect(at60Fps).toBe(7);
    expect(atIrregularSteps).toBe(7);
  });

  it("reclaims enemy projectiles once they cross the configured off-screen margin", async () => {
    const game = await createGame();
    const world = game.world;
    const config = world.getResource<ShmupConfig>("GameConfig");
    const pool = world.getResource<EnemyBulletPool>("EnemyBulletPool");
    if (!config || !pool) throw new Error("Expected game config and enemy projectile pool");

    const projectile = createEnemyBullet(
      world,
      config.WORLD_WIDTH / 2,
      config.WORLD_HEIGHT + config.OFFSCREEN_MARGIN + 1,
      0,
      config.ENEMY_BULLET_SPEED,
      pool
    );
    expect(world.isAlive(projectile)).toBe(true);

    game.update(0);

    expect(world.isAlive(projectile)).toBe(false);
  });
});
