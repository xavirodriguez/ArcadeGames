import { WorldUtils } from "@tiny-aster/core";
import { VerticalShmupGame } from "../VerticalShmupGame";
import { createEnemyBullet, createPlayerBullet } from "../EntityFactory";
import type { EnemyBulletPool, PlayerBulletPool } from "../EntityPool";
import { ShmupGrazeSystem } from "../systems/ShmupGrazeSystem";
import { ShmupBombSystem } from "../systems/ShmupBombSystem";
import { DEFAULT_GRAZE_MARGIN } from "../graze/grazeMath";

describe("Pooled projectile tagging (T5 prerequisite)", () => {
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

  it("tags pooled projectiles with the declared Shmup component names", async () => {
    const game = await createGame();
    const world = game.world;
    const enemyPool = world.getResource<EnemyBulletPool>("EnemyBulletPool");
    const playerPool = world.getResource<PlayerBulletPool>("PlayerBulletPool");
    if (!enemyPool || !playerPool) throw new Error("Expected projectile pools");

    const enemyBullet = createEnemyBullet(world, 100, 100, 0, 0, enemyPool);
    const playerBullet = createPlayerBullet(world, 100, 200, playerPool);

    expect(world.hasComponent(enemyBullet, "ShmupEnemyBullet")).toBe(true);
    expect(world.hasComponent(enemyBullet, "EnemyBullet")).toBe(false);
    expect(world.hasComponent(playerBullet, "ShmupPlayerBullet")).toBe(true);
    expect(world.hasComponent(playerBullet, "PlayerBullet")).toBe(false);
  });

  it("lets the graze system see a real pooled enemy bullet", async () => {
    const game = await createGame();
    const world = game.world;
    const pool = world.getResource<EnemyBulletPool>("EnemyBulletPool");
    if (!pool) throw new Error("Expected enemy bullet pool");
    const player = world.query("ShmupPlayer", "Transform")[0];
    const playerTransform = world.getComponent(player, "Transform");
    const config = world.getResource<{ PLAYER_COLLIDER_RADIUS: number; GRAZE_MARGIN: number }>("GameConfig");
    if (!playerTransform || !config) throw new Error("Expected player and config");

    const distance = config.PLAYER_COLLIDER_RADIUS + (config.GRAZE_MARGIN ?? DEFAULT_GRAZE_MARGIN) * 0.5;
    const bullet = createEnemyBullet(world, playerTransform.x + distance, playerTransform.y, 0, 0, pool);
    expect(world.getComponent(bullet, "ShmupEnemyBullet")?.grazed).toBe(false);

    const graze = new ShmupGrazeSystem();
    graze.update(world, 1 / 60);
    graze.update(world, 1 / 60);

    expect(world.getSingleton("ShmupGameState")?.grazeCount).toBe(1);
    expect(world.getComponent(bullet, "ShmupEnemyBullet")?.grazed).toBe(true);
  });

  it("lets the bomb system clear real pooled enemy bullets", async () => {
    const game = await createGame();
    const world = game.world;
    const pool = world.getResource<EnemyBulletPool>("EnemyBulletPool");
    const player = world.query("ShmupPlayer", "Input")[0];
    if (!pool || player === undefined) throw new Error("Expected pool and player");

    const bullet = createEnemyBullet(world, 100, 100, 0, 0, pool);
    expect(world.query("ShmupEnemyBullet")).toHaveLength(1);
    world.mutateComponent(player, "Input", (input) => {
      input.actions = ["bomb" as never];
    });

    const bomb = new ShmupBombSystem();
    bomb.update(world, 1 / 60);
    world.flush();

    expect(world.query("ShmupEnemyBullet")).toHaveLength(0);
    expect(world.isAlive(bullet)).toBe(false);
  });

  it("resets the graze flag when a pooled bullet is reused", async () => {
    const game = await createGame();
    const world = game.world;
    const pool = world.getResource<EnemyBulletPool>("EnemyBulletPool");
    const player = world.query("ShmupPlayer", "Transform")[0];
    const playerTransform = world.getComponent(player, "Transform");
    const config = world.getResource<{ PLAYER_COLLIDER_RADIUS: number; GRAZE_MARGIN: number }>("GameConfig");
    if (!pool || !playerTransform || !config) throw new Error("Expected test fixtures");

    const distance = config.PLAYER_COLLIDER_RADIUS + (config.GRAZE_MARGIN ?? DEFAULT_GRAZE_MARGIN) * 0.5;
    const first = createEnemyBullet(world, playerTransform.x + distance, playerTransform.y, 0, 0, pool);
    new ShmupGrazeSystem().update(world, 1 / 60);
    expect(world.getComponent(first, "ShmupEnemyBullet")?.grazed).toBe(true);

    WorldUtils.removeOrReclaim(world, first);
    world.flush();
    const reused = createEnemyBullet(world, 200, 300, 0, 0, pool);
    expect(world.getComponent(reused, "ShmupEnemyBullet")?.grazed).toBe(false);
  });
});
