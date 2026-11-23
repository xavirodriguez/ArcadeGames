import { hashAoS } from "@tiny-aster/core";
import { VerticalShmupGame } from "../VerticalShmupGame";
import { createEnemy, createEnemyBullet } from "../EntityFactory";
import type { EnemyBulletPool } from "../EntityPool";
import { ShmupGrazeSystem } from "../systems/ShmupGrazeSystem";
import { ShmupCollisionSystem } from "../systems/ShmupCollisionSystem";
import { DEFAULT_GRAZE_MARGIN } from "../graze/grazeMath";
import { grazeBombRewards, grantBombs } from "../bombs/bombEconomy";

describe("Bomb economy helpers (T5)", () => {
  it("pays once per whole graze threshold and preserves the remainder", () => {
    expect(grazeBombRewards(0, 39, 40)).toBe(0);
    expect(grazeBombRewards(0, 40, 40)).toBe(1);
    expect(grazeBombRewards(0, 80, 40)).toBe(2);
    expect(grazeBombRewards(40, 79, 40)).toBe(0);
    expect(grazeBombRewards(79, 80, 40)).toBe(1);
    expect(grazeBombRewards(80, 81, 40)).toBe(0);
    expect(grazeBombRewards(50, 40, 40)).toBe(0);
    expect(grazeBombRewards(0, 80, 0)).toBe(0);
  });

  it("grants stock up to the configured cap", () => {
    expect(grantBombs(3, 1, 5)).toBe(4);
    expect(grantBombs(4, 2, 5)).toBe(5);
    expect(grantBombs(5, 2, 5)).toBe(5);
    expect(grantBombs(0, -1, 5)).toBe(0);
    expect(grantBombs(-2, 1, 5)).toBe(1);
  });
});

describe("Graze bomb rewards (T5)", () => {
  const games: VerticalShmupGame[] = [];

  afterEach(() => {
    for (const game of games.splice(0)) game.destroy();
  });

  async function createGame(seed?: number): Promise<VerticalShmupGame> {
    const game = new VerticalShmupGame({
      headless: true,
      manualLoop: true,
      gameOptions: seed === undefined ? undefined : { seed }
    });
    games.push(game);
    await game.init();
    game.update(0);
    return game;
  }

  function placeGrazeBullet(game: VerticalShmupGame): void {
    const world = game.world;
    const pool = world.getResource<EnemyBulletPool>("EnemyBulletPool");
    const playerTransform = world.getComponent(world.query("ShmupPlayer", "Transform")[0], "Transform");
    const config = world.getResource<{ PLAYER_COLLIDER_RADIUS: number; GRAZE_MARGIN: number }>("GameConfig");
    if (!pool || !playerTransform || !config) throw new Error("Expected graze fixtures");
    const distance = config.PLAYER_COLLIDER_RADIUS + (config.GRAZE_MARGIN ?? DEFAULT_GRAZE_MARGIN) * 0.5;
    createEnemyBullet(world, playerTransform.x + distance, playerTransform.y, 0, 0, pool);
  }

  function setGraze(game: VerticalShmupGame, grazeCount: number, bombs: number): void {
    game.world.mutateSingleton("ShmupGameState", (state) => {
      state.grazeCount = grazeCount;
      state.bombsRemaining = bombs;
    });
  }

  it("awards no bomb at 39 grazes and one at 40", async () => {
    const game = await createGame();
    setGraze(game, 39, 3);
    placeGrazeBullet(game);
    new ShmupGrazeSystem().update(game.world, 1 / 60);

    expect(game.world.getSingleton("ShmupGameState")?.grazeCount).toBe(40);
    expect(game.world.getSingleton("ShmupGameState")?.bombsRemaining).toBe(4);
  });

  it("awards two bombs by 80 grazes without paying twice", async () => {
    const game = await createGame();
    setGraze(game, 39, 3);
    placeGrazeBullet(game);
    const graze = new ShmupGrazeSystem();
    graze.update(game.world, 1 / 60);
    graze.update(game.world, 1 / 60);
    graze.update(game.world, 1 / 60);
    expect(game.world.getSingleton("ShmupGameState")?.bombsRemaining).toBe(4);

    setGraze(game, 79, 4);
    placeGrazeBullet(game);
    graze.update(game.world, 1 / 60);

    expect(game.world.getSingleton("ShmupGameState")?.grazeCount).toBe(80);
    expect(game.world.getSingleton("ShmupGameState")?.bombsRemaining).toBe(5);
  });

  it("preserves graze excess and never exceeds the stock cap", async () => {
    const game = await createGame();
    setGraze(game, 80, 4);
    placeGrazeBullet(game);
    new ShmupGrazeSystem().update(game.world, 1 / 60);

    expect(game.world.getSingleton("ShmupGameState")?.grazeCount).toBe(81);
    expect(game.world.getSingleton("ShmupGameState")?.bombsRemaining).toBe(4);

    setGraze(game, 119, 5);
    placeGrazeBullet(game);
    new ShmupGrazeSystem().update(game.world, 1 / 60);
    expect(game.world.getSingleton("ShmupGameState")?.bombsRemaining).toBe(5);
  });

  it("produces the same gameplay hash for normal and resimulated graze rewards", async () => {
    // Presentation juice/SFX are intentionally suppressed while resimulating,
    // so the authoritative gameplay singleton is hashed, not the whole world.
    const run = async (resimulating: boolean): Promise<string> => {
      const game = await createGame(0x6ba2);
      game.world.isReSimulating = resimulating;
      setGraze(game, 39, 3);
      placeGrazeBullet(game);
      const graze = new ShmupGrazeSystem();
      graze.update(game.world, 1 / 60);
      return hashAoS({
        tick: 0,
        entities: [],
        componentData: { ShmupGameState: { 0: game.world.getSingleton("ShmupGameState") } },
        seed: 0
      });
    };

    expect(await run(false)).toBe(await run(true));
  });
});

describe("Boss kill bomb reward (T5)", () => {
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

  function killBoss(game: VerticalShmupGame): number {
    const boss = createEnemy(game.world, 360, 0, "boss", 5);
    game.world.mutateComponent(boss, "Health", (health) => {
      health.current = 0;
    });
    return boss;
  }

  it("grants exactly one bomb and ignores repeated processing", async () => {
    const game = await createGame();
    killBoss(game);
    const collision = new ShmupCollisionSystem();
    collision.update(game.world, 1 / 60);
    expect(game.world.getSingleton("ShmupGameState")?.bombsRemaining).toBe(4);

    collision.update(game.world, 1 / 60);
    collision.update(game.world, 1 / 60);
    expect(game.world.getSingleton("ShmupGameState")?.bombsRemaining).toBe(4);
  });

  it("respects the stock cap", async () => {
    const game = await createGame();
    game.world.mutateSingleton("ShmupGameState", (state) => {
      state.bombsRemaining = 5;
    });
    killBoss(game);
    new ShmupCollisionSystem().update(game.world, 1 / 60);
    expect(game.world.getSingleton("ShmupGameState")?.bombsRemaining).toBe(5);
  });

  it("does not reward normal enemies", async () => {
    const game = await createGame();
    const enemy = createEnemy(game.world, 100, 100, "straight", 1);
    game.world.mutateComponent(enemy, "Health", (health) => {
      health.current = 0;
    });
    new ShmupCollisionSystem().update(game.world, 1 / 60);
    expect(game.world.getSingleton("ShmupGameState")?.bombsRemaining).toBe(3);
  });
});
