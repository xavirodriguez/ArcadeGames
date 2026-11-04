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
    const config = world.getResource<GalaxianConfig>("GameConfig");
    const playerTransform = world.getMutableComponent(player, "Transform");
    if (!config || !playerTransform) throw new Error("Player transform or Galaxian config missing");

    playerTransform.x = config.worldWidth / 4;
    playerTransform.y = config.worldHeight / 2;
    playerTransform.dirty = true;

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

    const respawnTransform = world.getComponent(player, "Transform");
    expect(respawnTransform?.x).toBe(config.worldWidth / 2);
    expect(respawnTransform?.y).toBe(config.worldHeight - 50);
    expect(respawnTransform?.worldX).toBe(respawnTransform?.x);
    expect(respawnTransform?.worldY).toBe(respawnTransform?.y);
    expect(respawnTransform?.dirty).toBe(false);

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

  it("clears a complete wave, waits 1.5 seconds and starts a dive-capable next wave", async () => {
    const game = new GalaxianGame({ headless: true, seed: 12345 });
    await game.init();
    game.stop();

    const world = game.getWorld();
    const config = world.getResource<GalaxianConfig>("GameConfig");
    if (!config) throw new Error("Galaxian config missing");

    config.dive.intervalMs = 20;
    config.dive.windupMs = 0;
    config.dive.maxConcurrentDives = 1;
    config.wave.speedMultiplierPerWave = 1;
    config.wave.maxConcurrentDivesCap = 1;

    const firstWaveEntities = world.query("GalaxianEnemy", "Transform");
    const firstWaveIds = new Set(firstWaveEntities);
    const originalEnemyCount = firstWaveEntities.length;
    const completedLevels: number[] = [];
    game.getEventBus().on("wave:completed", ({ level }) => {
      completedLevels.push(level);
    });

    for (const enemyEntity of firstWaveEntities) {
      const enemy = world.getComponent(enemyEntity, "GalaxianEnemy");
      const transform = world.getComponent(enemyEntity, "Transform");
      if (!enemy || !transform) throw new Error("First-wave enemy data missing");

      for (let hit = 0; hit < enemy.hitsRemaining; hit += 1) {
        game.getBulletPool().acquirePlayerBullet(world, transform.x, transform.y);
      }
    }
    world.flush();

    game.update(1 / 60);
    expect(game.getGameState().enemiesRemaining).toBe(0);
    expect(world.query("GalaxianEnemy")).toHaveLength(0);
    expect(game.getGameState().level).toBe(1);
    expect(completedLevels).toHaveLength(0);

    game.update(1 / 60);
    expect(game.getGameState().level).toBe(2);
    expect(game.getGameState().waveTransitionRemaining).toBeCloseTo(1.5);
    expect(completedLevels).toEqual([2]);

    game.update(1.49);
    expect(game.getGameState().waveTransitionRemaining).toBeGreaterThan(0);
    expect(world.query("GalaxianEnemy")).toHaveLength(0);

    game.update(0.02);
    expect(game.getGameState().waveTransitionRemaining).toBe(0);
    expect(game.getGameState().enemiesRemaining).toBe(originalEnemyCount);

    const secondWaveEntities = world.query("GalaxianEnemy");
    expect(secondWaveEntities).toHaveLength(originalEnemyCount);
    expect(secondWaveEntities.every((entity) => !firstWaveIds.has(entity))).toBe(true);
    expect(game.getGameState().diveTimer).toBeCloseTo(config.dive.intervalMs / 1000);

    for (const enemyEntity of secondWaveEntities) {
      const enemy = world.getComponent(enemyEntity, "GalaxianEnemy");
      expect(enemy?.state).toBe("in_slot");
      expect(world.hasComponent(enemyEntity, "PathPattern")).toBe(false);
    }

    game.update(0.05);
    expect(
      world.query("GalaxianEnemy").some((entity) => {
        return world.getComponent(entity, "GalaxianEnemy")?.state === "windup";
      })
    ).toBe(true);

    game.update(0.05);
    expect(
      world.query("GalaxianEnemy").some((entity) => {
        return world.getComponent(entity, "GalaxianEnemy")?.state === "diving";
      })
    ).toBe(true);
    expect(game.getGameState().activeDivesCount).toBe(1);

    await game.destroy();
  });

  it("does not advance a wave while enemy entities remain despite a zero counter", async () => {
    const game = new GalaxianGame({ headless: true, seed: 12345 });
    await game.init();
    game.stop();

    const world = game.getWorld();
    const stateEntity = world.query("GameState")[0];
    world.mutateComponent(stateEntity, "GameState", (state) => {
      state.enemiesRemaining = 0;
    });

    let completedEvents = 0;
    game.getEventBus().on("wave:completed", () => {
      completedEvents += 1;
    });

    game.update(1 / 60);

    expect(game.getGameState().level).toBe(1);
    expect(game.getGameState().waveTransitionRemaining).toBe(0);
    expect(completedEvents).toBe(0);
    expect(world.query("GalaxianEnemy").length).toBeGreaterThan(0);

    await game.destroy();
  });

  it("does not increment the level again when next-wave spawning is unavailable", async () => {
    const game = new GalaxianGame({ headless: true, seed: 12345 });
    await game.init();
    game.stop();

    const world = game.getWorld();
    for (const enemy of world.query("GalaxianEnemy")) {
      world.commands.removeEntity(enemy);
    }
    world.flush();

    const stateEntity = world.query("GameState")[0];
    world.mutateComponent(stateEntity, "GameState", (state) => {
      state.enemiesRemaining = 0;
    });

    let completedEvents = 0;
    game.getEventBus().on("wave:completed", () => {
      completedEvents += 1;
    });

    game.update(1 / 60);
    expect(game.getGameState().level).toBe(2);
    expect(completedEvents).toBe(1);

    for (const formation of world.query("Formation")) {
      world.commands.removeEntity(formation);
    }
    world.flush();

    game.update(1.5);
    expect(game.getGameState().waveTransitionRemaining).toBeCloseTo(1.5);

    game.update(1.5);
    expect(game.getGameState().level).toBe(2);
    expect(completedEvents).toBe(1);
    expect(game.getGameState().waveTransitionRemaining).toBeCloseTo(1.5);

    await game.destroy();
  });
});
