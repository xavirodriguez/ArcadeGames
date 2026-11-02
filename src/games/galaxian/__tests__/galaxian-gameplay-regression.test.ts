import { GalaxianGame } from "../GalaxianGame";
import type { GalaxianConfig } from "../types/GalaxianConfigSchema";

describe("Galaxian gameplay regressions", () => {
  it("integrates projectile velocity and advances the projectile transform", async () => {
    const game = new GalaxianGame({ headless: true, seed: 12345 });
    await game.init();
    game.stop();

    const world = game.getWorld();
    const bullet = game.getBulletPool().acquirePlayerBullet(world, 200, 240);
    world.flush();
    const initialY = world.getComponent(bullet, "Transform")?.y;

    game.update(1 / 60);

    const nextY = world.getComponent(bullet, "Transform")?.y;
    if (initialY === undefined || nextY === undefined) {
      throw new Error("Player bullet transform was not available after integration");
    }
    expect(nextY).toBeLessThan(initialY);

    await game.destroy();
  });

  it("releases a missed single-shot projectile and allows the next shot", async () => {
    const game = new GalaxianGame({ headless: true, seed: 12345 });
    await game.init();
    game.stop();

    const world = game.getWorld();
    const player = world.query("Player", "Transform")[0];
    const playerTransform = world.getComponent(player, "Transform");
    if (!playerTransform) throw new Error("Player transform missing");

    game.setInput({ shoot: true });
    for (let tick = 0; tick < 100; tick++) {
      game.update(1 / 60);
    }

    const activeBullets = world.query("PlayerBullet", "Transform");
    expect(activeBullets).toHaveLength(1);
    expect(world.query("GalaxianBulletPoolEntry").filter((entity) => {
      return world.getComponent(entity, "GalaxianBulletPoolEntry")?.owner === "player";
    })).toHaveLength(1);

    const activeBulletTransform = world.getComponent(activeBullets[0], "Transform");
    expect(activeBulletTransform).toBeDefined();
    expect(activeBulletTransform?.y).toBeGreaterThan(0);
    expect(activeBulletTransform?.y).toBeLessThan(playerTransform.y - 100);

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
