import { BoundarySystem } from "@tiny-aster/core";
import { VerticalShmupGame } from "../VerticalShmupGame";
import { createEnemy } from "../EntityFactory";
import { EnemyPathSystem } from "../systems/EnemyPathSystem";
import type { ShmupConfig } from "../types/ShmupConfigSchema";
import { computeBossHp } from "../boss/bossMath";

describe("Boss health (T2)", () => {
  const games: VerticalShmupGame[] = [];

  afterEach(() => {
    for (const game of games.splice(0)) game.destroy();
  });

  async function createGame(): Promise<VerticalShmupGame> {
    const game = new VerticalShmupGame({ headless: true, manualLoop: true });
    games.push(game);
    await game.init();
    game.update(0);
    return game;
  }

  function clearEnemies(game: VerticalShmupGame): void {
    for (const enemy of game.world.query("ShmupEnemy")) {
      game.world.reclaimEntity(enemy);
    }
    game.world.getCommandBuffer().flush(game.world as never);
  }

  it("uses the dedicated boss curve instead of the normal enemy formula", async () => {
    const game = await createGame();
    const config = game.world.getResource<ShmupConfig>("GameConfig");
    if (!config) throw new Error("Expected game config");

    const waveFiveBoss = createEnemy(game.world, 360, 0, "boss", 5);
    const waveTenBoss = createEnemy(game.world, 360, 0, "boss", 10);
    const normal = createEnemy(game.world, 100, 100, "straight", 10);

    expect(config.BOSS_HP_BASE).toBe(250);
    expect(game.world.getComponent(waveFiveBoss, "Health")).toMatchObject({ current: 250, max: 250 });
    expect(game.world.getComponent(waveTenBoss, "Health")?.max).toBe(270);
    expect(game.world.getComponent(normal, "Health")?.max).toBe(config.ENEMY_HP + 3);
  });

  it("keeps the pure curve configurable for future difficulty tuning", () => {
    expect(computeBossHp(5)).toBe(250);
    expect(computeBossHp(6)).toBe(254);
    expect(computeBossHp(15)).toBe(290);
    expect(computeBossHp(1)).toBe(250);
    expect(computeBossHp(5, { base: 100, scalingStartWave: 3, perExtraWave: 10 })).toBe(120);
  });
});

describe("Boss hover movement (T2)", () => {
  const games: VerticalShmupGame[] = [];

  afterEach(() => {
    for (const game of games.splice(0)) game.destroy();
  });

  async function createBoss(): Promise<{ game: VerticalShmupGame; boss: number; config: ShmupConfig }> {
    const game = new VerticalShmupGame({ headless: true, manualLoop: true });
    games.push(game);
    await game.init();
    game.update(0);
    const config = game.world.getResource<ShmupConfig>("GameConfig");
    if (!config) throw new Error("Expected game config");
    const boss = createEnemy(game.world, config.WORLD_WIDTH / 2, -90, "boss", 5);
    return { game, boss, config };
  }

  function stepPath(game: VerticalShmupGame, steps: number[], system: EnemyPathSystem): void {
    for (const deltaTime of steps) system.update(game.world, deltaTime);
  }

  it("reaches the hover altitude and stays in the combat area", async () => {
    const { game, boss, config } = await createBoss();
    const system = new EnemyPathSystem();
    const hoverY = config.WORLD_HEIGHT * config.BOSS_HOVER_Y_RATIO;
    stepPath(game, Array.from({ length: 300 }, () => 1 / 60), system);

    const transform = game.world.getComponent(boss, "Transform");
    if (!transform) throw new Error("Expected boss transform");
    expect(Math.abs(transform.y - hoverY)).toBeLessThanOrEqual(config.BOSS_HOVER_BOB_AMPLITUDE + 1);
    expect(transform.y).toBeGreaterThan(hoverY - config.BOSS_HOVER_BOB_AMPLITUDE - 1);
    expect(transform.y).toBeLessThan(hoverY + config.BOSS_HOVER_BOB_AMPLITUDE + 1);
    expect(transform.x).toBeGreaterThan(0);
    expect(transform.x).toBeLessThan(config.WORLD_WIDTH);
  });

  it("is deterministic for the same delta sequence", async () => {
    const first = await createBoss();
    const second = await createBoss();
    const steps = Array.from({ length: 240 }, () => 1 / 60);
    stepPath(first.game, steps, new EnemyPathSystem());
    stepPath(second.game, steps, new EnemyPathSystem());

    expect(first.game.world.getComponent(first.boss, "Transform")).toEqual(
      second.game.world.getComponent(second.boss, "Transform")
    );
  });

  it("is frame-rate independent for the same elapsed time", async () => {
    const at60 = await createBoss();
    const at30 = await createBoss();
    const irregular = await createBoss();

    stepPath(at60.game, Array.from({ length: 120 }, () => 1 / 60), new EnemyPathSystem());
    stepPath(at30.game, Array.from({ length: 60 }, () => 1 / 30), new EnemyPathSystem());
    stepPath(
      irregular.game,
      [0.07, 0.13, 0.21, 0.09, 0.16, 0.14, 0.2, 0.07, 0.13, 0.21, 0.09, 0.16, 0.14, 0.2],
      new EnemyPathSystem()
    );

    const expected = at60.game.world.getComponent(at60.boss, "Transform");
    expect(at30.game.world.getComponent(at30.boss, "Transform")?.y).toBeCloseTo(expected?.y ?? 0, 5);
    expect(irregular.game.world.getComponent(irregular.boss, "Transform")?.y).toBeCloseTo(expected?.y ?? 0, 5);
  });

  it("never leaves the world when boundary and path systems run together for 60 seconds", async () => {
    const { game, boss, config } = await createBoss();
    const path = new EnemyPathSystem();
    const boundary = new BoundarySystem();
    const hoverY = config.WORLD_HEIGHT * config.BOSS_HOVER_Y_RATIO;

    for (let step = 0; step < 3600; step += 1) {
      path.update(game.world, 1 / 60);
      boundary.update(game.world, 1 / 60);
      game.world.getCommandBuffer().flush(game.world as never);
      const transform = game.world.getComponent(boss, "Transform");
      if (!transform) throw new Error("Boss must survive the boundary check");
      expect(transform.x).toBeGreaterThanOrEqual(0);
      expect(transform.x).toBeLessThanOrEqual(config.WORLD_WIDTH);
      expect(transform.y).toBeLessThan(config.WORLD_HEIGHT * 0.5);
    }

    expect(game.world.isAlive(boss)).toBe(true);
    expect(game.world.getComponent(boss, "Transform")?.y).toBeGreaterThan(hoverY - config.BOSS_HOVER_BOB_AMPLITUDE - 1);
  });
});

describe("Boss spawn governance (T2)", () => {
  const games: VerticalShmupGame[] = [];

  afterEach(() => {
    for (const game of games.splice(0)) game.destroy();
  });

  async function createGameAtWaveFour(): Promise<VerticalShmupGame> {
    const game = new VerticalShmupGame({ headless: true, manualLoop: true });
    games.push(game);
    await game.init();
    game.update(0);
    for (const enemy of game.world.query("ShmupEnemy")) {
      game.world.reclaimEntity(enemy);
    }
    game.world.getCommandBuffer().flush(game.world as never);
    game.world.mutateSingleton("ShmupGameState", (state) => {
      state.wave = 4;
    });
    // Wave 4 clear -> wave 5 boss encounter.
    game.update(0);
    return game;
  }

  it("pauses normal spawning while a boss is alive and keeps the spawn timer frozen", async () => {
    const game = await createGameAtWaveFour();
    const world = game.world;
    const boss = world.query("ShmupEnemy").find(
      (entity) => world.getComponent(entity, "ShmupEnemy")?.archetype === "boss"
    );
    expect(boss).toBeDefined();
    expect(world.getSingleton("ShmupGameState")?.wave).toBe(5);
    const enemyCount = world.query("ShmupEnemy").length;
    expect(enemyCount).toBe(3);

    for (let step = 0; step < 180; step += 1) {
      game.update(1 / 60);
    }

    expect(world.query("ShmupEnemy").length).toBe(enemyCount);
    expect(world.query("ShmupEnemy").filter(
      (entity) => world.getComponent(entity, "ShmupEnemy")?.archetype === "boss"
    )).toHaveLength(1);
    expect(world.getSingleton("ShmupGameState")?.spawnTimer).toBe(0);
  });

  it("resumes wave progression only after the boss and its escorts are gone", async () => {
    const game = await createGameAtWaveFour();
    const world = game.world;
    const boss = world.query("ShmupEnemy").find(
      (entity) => world.getComponent(entity, "ShmupEnemy")?.archetype === "boss"
    );
    if (boss === undefined) throw new Error("Expected boss");
    const escorts = world.query("ShmupEnemy").filter((entity) => entity !== boss);
    expect(escorts).toHaveLength(2);

    world.reclaimEntity(boss);
    world.getCommandBuffer().flush(world as never);
    game.update(0);
    expect(world.getSingleton("ShmupGameState")?.wave).toBe(5);

    for (const escort of escorts) {
      world.reclaimEntity(escort);
    }
    world.getCommandBuffer().flush(world as never);
    game.update(0);
    expect(world.getSingleton("ShmupGameState")?.wave).toBe(6);
  });

  it("keeps the destroy boundary for normal enemies but not for the boss", async () => {
    const game = new VerticalShmupGame({ headless: true, manualLoop: true });
    games.push(game);
    await game.init();
    game.update(0);
    const config = game.world.getResource<ShmupConfig>("GameConfig");
    if (!config) throw new Error("Expected config");
    const boundary = new BoundarySystem();

    const boss = createEnemy(game.world, config.WORLD_WIDTH / 2, 0, "boss", 5);
    const normal = createEnemy(game.world, 100, 0, "straight", 1);
    game.world.mutateComponent(boss, "Transform", (transform) => {
      transform.y = config.WORLD_HEIGHT + config.OFFSCREEN_MARGIN * 2 + 10;
    });
    game.world.mutateComponent(normal, "Transform", (transform) => {
      transform.y = config.WORLD_HEIGHT + config.OFFSCREEN_MARGIN * 2 + 10;
    });

    boundary.update(game.world, 1 / 60);
    game.world.getCommandBuffer().flush(game.world as never);

    expect(game.world.isAlive(boss)).toBe(true);
    expect(game.world.isAlive(normal)).toBe(false);
  });
});
