import { VerticalShmupGame } from "../VerticalShmupGame";
import { selectShmupEnemyArchetype } from "../EnemyArchetypes";
import { isShmupBossWave } from "../boss/bossWaves";

function bossEntities(game: VerticalShmupGame): number[] {
  const world = game.world;
  return world.query("ShmupEnemy").filter(
    (entity) => world.getComponent(entity, "ShmupEnemy")?.archetype === "boss"
  );
}

describe("Unified boss waves (T4)", () => {
  const games: VerticalShmupGame[] = [];

  afterEach(() => {
    for (const game of games.splice(0)) game.destroy();
  });

  async function gameAtWave(previousWave: number): Promise<VerticalShmupGame> {
    const game = new VerticalShmupGame({
      headless: true,
      manualLoop: true,
      gameOptions: { seed: 0xb055 }
    });
    games.push(game);
    await game.init();
    game.update(0);
    for (const enemy of game.world.query("ShmupEnemy")) {
      game.world.reclaimEntity(enemy);
    }
    game.world.getCommandBuffer().flush(game.world as never);
    game.world.mutateSingleton("ShmupGameState", (state) => {
      state.wave = previousWave;
    });
    game.update(0);
    return game;
  }

  it("uses one predicate for waves 5 and 10", () => {
    expect(isShmupBossWave(5)).toBe(true);
    expect(isShmupBossWave(10)).toBe(true);
    expect(isShmupBossWave(4)).toBe(false);
    expect(isShmupBossWave(6)).toBe(false);
    expect(isShmupBossWave(9)).toBe(false);
  });

  it("selects the boss archetype only on real boss waves", () => {
    expect(selectShmupEnemyArchetype(5, 0)).toBe("boss");
    expect(selectShmupEnemyArchetype(10, 0)).toBe("boss");
    expect(selectShmupEnemyArchetype(4, 0)).not.toBe("boss");
    expect(selectShmupEnemyArchetype(6, 0)).not.toBe("boss");
    expect(selectShmupEnemyArchetype(9, 0)).not.toBe("boss");
    expect(selectShmupEnemyArchetype(5, 1)).not.toBe("boss");
  });

  it("spawns exactly one coherent boss encounter on each boss wave", async () => {
    for (const previousWave of [4, 9]) {
      const game = await gameAtWave(previousWave);
      const expectedWave = previousWave + 1;
      expect(game.world.getSingleton("ShmupGameState")?.wave).toBe(expectedWave);
      expect(bossEntities(game)).toHaveLength(1);
      expect(game.world.query("ShmupEnemy")).toHaveLength(3);
      const boss = bossEntities(game)[0];
      expect(game.world.getComponent(boss, "Health")?.max).toBeGreaterThan(200);
      expect(game.world.getComponent(boss, "EnemyPath")?.kind).toBe("hover");
    }
  });

  it("never spawns a boss on wave 4, 6 or 9", async () => {
    for (const previousWave of [3, 5, 8]) {
      const game = await gameAtWave(previousWave);
      expect(game.world.getSingleton("ShmupGameState")?.wave).toBe(previousWave + 1);
      expect(bossEntities(game)).toHaveLength(0);
    }
  });

  it("waits for the boss and both escorts before advancing the wave", async () => {
    const game = await gameAtWave(4);
    const world = game.world;
    const boss = bossEntities(game)[0];
    if (boss === undefined) throw new Error("Expected boss");
    const escorts = world.query("ShmupEnemy").filter((entity) => entity !== boss);
    expect(escorts).toHaveLength(2);

    world.reclaimEntity(boss);
    world.getCommandBuffer().flush(world as never);
    game.update(0);
    expect(world.getSingleton("ShmupGameState")?.wave).toBe(5);

    world.reclaimEntity(escorts[0]);
    world.getCommandBuffer().flush(world as never);
    game.update(0);
    expect(world.getSingleton("ShmupGameState")?.wave).toBe(5);

    world.reclaimEntity(escorts[1]);
    world.getCommandBuffer().flush(world as never);
    game.update(0);
    expect(world.getSingleton("ShmupGameState")?.wave).toBe(6);
    expect(bossEntities(game)).toHaveLength(0);
  });
});
