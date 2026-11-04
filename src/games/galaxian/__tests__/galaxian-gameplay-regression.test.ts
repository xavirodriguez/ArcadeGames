import { GalaxianGame } from "../GalaxianGame";
import type { GalaxianConfig } from "../types/GalaxianConfigSchema";

describe("Galaxian gameplay regressions", () => {
  it("integrates projectile velocity and synchronizes world coordinates for both bullet types", async () => {
    const game = new GalaxianGame({ headless: true, seed: 12345 });
    await game.init();
    game.stop();

    const world = game.getWorld();
    const playerBullet = game.getBulletPool().acquirePlayerBullet(world, 200, 240);
    const enemyBullet = game.getBulletPool().acquireEnemyBullet(world, 300, 180);
    world.flush();

    const initialPlayerY = world.getComponent(playerBullet, "Transform")?.y;
    const initialEnemyY = world.getComponent(enemyBullet, "Transform")?.y;

    game.update(1 / 60);

    const playerTransform = world.getComponent(playerBullet, "Transform");
    const enemyTransform = world.getComponent(enemyBullet, "Transform");
    if (
      initialPlayerY === undefined ||
      initialEnemyY === undefined ||
      !playerTransform ||
      !enemyTransform
    ) {
      throw new Error("Projectile transforms were not available after integration");
    }

    expect(playerTransform.y).toBeLessThan(initialPlayerY);
    expect(enemyTransform.y).toBeGreaterThan(initialEnemyY);
    expect(playerTransform.worldX).toBe(playerTransform.x);
    expect(playerTransform.worldY).toBe(playerTransform.y);
    expect(enemyTransform.worldX).toBe(enemyTransform.x);
    expect(enemyTransform.worldY).toBe(enemyTransform.y);
    expect(playerTransform.dirty).toBe(false);
    expect(enemyTransform.dirty).toBe(false);

    await game.destroy();
  });

  it("synchronizes the player's world coordinates after horizontal movement", async () => {
    const game = new GalaxianGame({ headless: true, seed: 12345 });
    await game.init();
    game.stop();

    const world = game.getWorld();
    const player = world.query("Player", "Transform")[0];
    const beforeX = world.getComponent(player, "Transform")?.x;
    if (beforeX === undefined) throw new Error("Player transform was not available before movement");

    game.setInput({ moveLeft: true });
    game.update(1 / 60);

    const after = world.getComponent(player, "Transform");
    if (!after) throw new Error("Player transform was not available after movement");

    expect(after.x).toBeLessThan(beforeX);
    expect(after.worldX).toBe(after.x);
    expect(after.worldY).toBe(after.y);
    expect(after.dirty).toBe(false);

    await game.destroy();
  });

  it("releases a missed single-shot projectile and reuses it for the next shot", async () => {
    const game = new GalaxianGame({ headless: true, seed: 12345 });
    await game.init();
    game.stop();

    const world = game.getWorld();
    game.setInput({ shoot: true });
    game.update(1 / 60);

    const firstBullet = world.query("PlayerBullet", "Transform")[0];
    expect(firstBullet).toBeDefined();
    game.setInput({ shoot: false });

    let ticksUntilCleanup = 0;
    while (world.hasComponent(firstBullet, "PlayerBullet") && ticksUntilCleanup < 100) {
      game.update(1 / 60);
      ticksUntilCleanup++;
    }

    expect(ticksUntilCleanup).toBeLessThan(100);
    expect(world.hasComponent(firstBullet, "PlayerBullet")).toBe(false);
    expect(world.getComponent(firstBullet, "GalaxianBulletPoolEntry")?.available).toBe(true);

    game.setInput({ shoot: true });
    game.update(1 / 60);

    const nextShot = world.query("PlayerBullet", "Transform");
    expect(nextShot).toHaveLength(1);
    expect(nextShot[0]).toBe(firstBullet);
    expect(world.getComponent(firstBullet, "GalaxianBulletPoolEntry")?.available).toBe(false);

    await game.destroy();
  });

  it("protects the player after respawn until the invulnerability timer expires", async () => {
    const game = new GalaxianGame({ headless: true, seed: 12345 });
    await game.init();
    game.stop();

    const world = game.getWorld();
    const player = world.query("Player", "Transform")[0];
    const playerTransform = world.getComponent(player, "Transform");
    if (!playerTransform) throw new Error("Player transform missing");

    const spawnHit = (): void => {
      const transform = world.getComponent(player, "Transform");
      if (!transform) throw new Error("Player transform missing before collision");
      game.getBulletPool().acquireEnemyBullet(world, transform.x, transform.y);
      world.flush();
      game.update(1 / 60);
    };

    spawnHit();
    expect(game.getGameState().lives).toBe(2);
    expect(world.hasComponent(player, "Invulnerable")).toBe(true);

    spawnHit();
    expect(game.getGameState().lives).toBe(2);

    game.update(2.1);
    expect(world.hasComponent(player, "Invulnerable")).toBe(false);

    spawnHit();
    expect(game.getGameState().lives).toBe(1);

    await game.destroy();
  });

  it("emits game over once, freezes gameplay and restarts with a clean state", async () => {
    const game = new GalaxianGame({ headless: true, seed: 12345 });
    await game.init();
    game.stop();

    const world = game.getWorld();
    const config = world.getResource<GalaxianConfig>("GameConfig");
    if (!config) throw new Error("Galaxian config missing");
    config.INVULNERABILITY_DURATION_MS = 0;

    const eventBus = game.getEventBus();
    let gameOverEvents = 0;
    eventBus.on("game:over", () => {
      gameOverEvents++;
    });

    const player = world.query("Player", "Transform")[0];
    const hitPlayer = (): void => {
      const transform = world.getComponent(player, "Transform");
      if (!transform) throw new Error("Player transform missing before collision");
      game.getBulletPool().acquireEnemyBullet(world, transform.x, transform.y);
      world.flush();
      game.update(1 / 60);
    };

    hitPlayer();
    hitPlayer();
    hitPlayer();

    expect(game.getGameState().lives).toBe(0);
    expect(game.isGameOver()).toBe(true);
    expect(gameOverEvents).toBe(1);

    const transformBeforeGameOverTick = world.getComponent(player, "Transform");
    const xBeforeGameOverTick = transformBeforeGameOverTick?.x;
    const currentLevel = game.getGameState().level;
    game.setInput({ moveRight: true, shoot: true });
    game.update(0.5);

    expect(world.getComponent(player, "Transform")?.x).toBe(xBeforeGameOverTick);
    expect(game.getGameState().level).toBe(currentLevel);
    expect(world.query("PlayerBullet")).toHaveLength(0);

    await game.restart();
    game.stop();

    expect(game.getGameState().lives).toBe(3);
    expect(game.getGameState().score).toBe(0);
    expect(game.getGameState().level).toBe(1);
    expect(game.isGameOver()).toBe(false);
    expect(game.getWorld().query("Player")).toHaveLength(1);

    await game.destroy();
  });

  it("starts the next wave after the transition and does not retain removed enemies", async () => {
    const game = new GalaxianGame({ headless: true, seed: 12345 });
    await game.init();
    game.stop();

    const world = game.getWorld();
    const originalEnemyCount = world.query("GalaxianEnemy").length;
    for (const enemy of world.query("GalaxianEnemy")) {
      world.commands.removeEntity(enemy);
    }
    world.flush();

    const stateEntity = world.query("GameState")[0];
    world.mutateComponent(stateEntity, "GameState", (state) => {
      state.enemiesRemaining = 0;
    });

    game.update(1 / 60);
    expect(game.getGameState().level).toBe(2);
    expect(game.getGameState().waveTransitionRemaining).toBeCloseTo(1.5);

    game.update(1.5);
    expect(game.getGameState().waveTransitionRemaining).toBe(0);
    expect(game.getGameState().enemiesRemaining).toBe(originalEnemyCount);
    expect(world.query("GalaxianEnemy")).toHaveLength(originalEnemyCount);

    await game.destroy();
  });
});
