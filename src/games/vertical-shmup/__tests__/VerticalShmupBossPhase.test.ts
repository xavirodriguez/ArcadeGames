import { hashSoA, SoAWorldSnapshot, World } from "@tiny-aster/core";
import { VerticalShmupGame } from "../VerticalShmupGame";
import { createEnemy } from "../EntityFactory";
import { ShmupBossPhaseSystem } from "../systems/ShmupBossPhaseSystem";
import { resolveBossPhase, nextBossPhase } from "../boss/bossPhase";
import type { BulletPatternConfig } from "../../shared/BulletPatternSystem";
import type { ShmupComponentRegistry } from "../types/ShmupTypes";

const SEED = 0x5eed1234;

function bossConfig(world: World<ShmupComponentRegistry>, boss: number): BulletPatternConfig {
  // In dev mode `getComponent` freezes the object and `getMutableComponent`
  // clones it once; read the live reference so identity assertions are stable.
  const pattern = world.getMutableComponent(boss, "BulletPattern");
  if (!pattern) throw new Error("Expected boss bullet pattern");
  return pattern.config;
}

function setHealth(world: World<ShmupComponentRegistry>, boss: number, current: number): void {
  world.mutateComponent(boss, "Health", (health) => {
    health.current = current;
  });
}

function currentPhase(world: World<ShmupComponentRegistry>, boss: number): number {
  const phase = world.getComponent(boss, "BossPhase");
  if (!phase) throw new Error("Expected boss phase component");
  return phase.phase;
}

describe("Boss phase resolver (T3)", () => {
  it("uses strict, non-overlapping health thresholds", () => {
    expect(resolveBossPhase(67, 100)).toBe(1);
    expect(resolveBossPhase(66, 100)).toBe(2);
    expect(resolveBossPhase(34, 100)).toBe(2);
    expect(resolveBossPhase(33, 100)).toBe(3);
    expect(resolveBossPhase(0, 100)).toBe(3);
    expect(resolveBossPhase(10, 0)).toBe(3);
  });

  it("never regresses on heal", () => {
    expect(nextBossPhase(3, 1)).toBe(3);
    expect(nextBossPhase(2, 1)).toBe(2);
    expect(nextBossPhase(1, 3)).toBe(3);
  });
});

describe("Boss attack phases in simulation (T3)", () => {
  const games: VerticalShmupGame[] = [];

  afterEach(() => {
    for (const game of games.splice(0)) game.destroy();
  });

  async function createBossGame(): Promise<{
    game: VerticalShmupGame;
    boss: number;
    system: ShmupBossPhaseSystem;
  }> {
    const game = new VerticalShmupGame({ headless: true, manualLoop: true, gameOptions: { seed: SEED } });
    games.push(game);
    await game.init();
    game.update(0);
    for (const enemy of game.world.query("ShmupEnemy")) {
      game.world.reclaimEntity(enemy);
    }
    game.world.getCommandBuffer().flush(game.world as never);
    const boss = createEnemy(game.world, 360, 0, "boss", 5);
    game.world.getCommandBuffer().flush(game.world as never);
    return { game, boss, system: new ShmupBossPhaseSystem() };
  }

  it("starts in phase 1 with the 8-bullet opening ring", async () => {
    const { game, boss } = await createBossGame();
    expect(currentPhase(game.world, boss)).toBe(1);
    expect(bossConfig(game.world, boss)).toMatchObject({ kind: "ring", bulletCount: 8 });
  });

  it("enters phase 2 at exactly 66% and phase 3 at exactly 33%", async () => {
    const { game, boss, system } = await createBossGame();
    const health = game.world.getComponent(boss, "Health");
    if (!health) throw new Error("Expected boss health");

    setHealth(game.world, boss, Math.floor(health.max * 0.66));
    system.update(game.world, 0);
    expect(currentPhase(game.world, boss)).toBe(2);

    setHealth(game.world, boss, Math.floor(health.max * 0.33));
    system.update(game.world, 0);
    expect(currentPhase(game.world, boss)).toBe(3);
  });

  it("stays in phase 1 above 66%", async () => {
    const { game, boss, system } = await createBossGame();
    const health = game.world.getComponent(boss, "Health");
    if (!health) throw new Error("Expected boss health");

    setHealth(game.world, boss, Math.ceil(health.max * 0.66) + 1);
    system.update(game.world, 0);
    expect(currentPhase(game.world, boss)).toBe(1);
    expect(bossConfig(game.world, boss).kind).toBe("ring");
  });

  it("rewrites the pattern only on a phase change", async () => {
    const { game, boss, system } = await createBossGame();
    setHealth(game.world, boss, Math.floor((game.world.getComponent(boss, "Health")?.max ?? 250) * 0.5));
    system.update(game.world, 0);
    const configAfterChange = bossConfig(game.world, boss);
    game.world.mutateComponent(boss, "BulletPattern", (pattern) => {
      pattern.phase = 7;
    });

    system.update(game.world, 0);
    system.update(game.world, 0);

    expect(currentPhase(game.world, boss)).toBe(2);
    expect(bossConfig(game.world, boss)).toBe(configAfterChange);
    expect(game.world.getComponent(boss, "BulletPattern")?.phase).toBe(7);
  });

  it("resets the spiral phase to zero on transition for a reproducible sequence", async () => {
    const { game, boss, system } = await createBossGame();
    game.world.mutateComponent(boss, "BulletPattern", (pattern) => {
      pattern.phase = 5;
    });
    setHealth(game.world, boss, Math.floor((game.world.getComponent(boss, "Health")?.max ?? 250) * 0.5));
    system.update(game.world, 0);

    expect(game.world.getComponent(boss, "BulletPattern")?.phase).toBe(0);
  });

  it("does not regress when the boss is healed", async () => {
    const { game, boss, system } = await createBossGame();
    const health = game.world.getComponent(boss, "Health");
    if (!health) throw new Error("Expected boss health");

    setHealth(game.world, boss, Math.floor(health.max * 0.33));
    system.update(game.world, 0);
    const phaseThreeConfig = bossConfig(game.world, boss);
    setHealth(game.world, boss, health.max);
    system.update(game.world, 0);

    expect(currentPhase(game.world, boss)).toBe(3);
    expect(bossConfig(game.world, boss)).toBe(phaseThreeConfig);
  });

  it("maps phases to ring/8, spiral/8 and spiral/12 with reproducible spin", async () => {
    const { game, boss, system } = await createBossGame();
    expect(bossConfig(game.world, boss)).toMatchObject({ kind: "ring", bulletCount: 8 });

    setHealth(game.world, boss, Math.floor((game.world.getComponent(boss, "Health")?.max ?? 250) * 0.5));
    system.update(game.world, 0);
    expect(bossConfig(game.world, boss)).toMatchObject({
      kind: "spiral",
      bulletCount: 8,
      spinPerShot: Math.PI / 8
    });

    setHealth(game.world, boss, Math.floor((game.world.getComponent(boss, "Health")?.max ?? 250) * 0.2));
    system.update(game.world, 0);
    expect(bossConfig(game.world, boss)).toMatchObject({
      kind: "spiral",
      bulletCount: 12,
      spinPerShot: Math.PI / 12
    });
  });

  it("produces identical state hashes for two seeded games following the same sequence", async () => {
    const run = async (): Promise<string> => {
      const game = new VerticalShmupGame({ headless: true, manualLoop: true, gameOptions: { seed: SEED } });
      games.push(game);
      await game.init();
      game.update(0);
      for (const enemy of game.world.query("ShmupEnemy")) {
        game.world.reclaimEntity(enemy);
      }
      game.world.getCommandBuffer().flush(game.world as never);
      game.world.mutateSingleton("ShmupGameState", (state) => {
        state.wave = 5;
      });
      const boss = createEnemy(game.world, 360, 0, "boss", 5);
      game.world.getCommandBuffer().flush(game.world as never);

      for (const ratio of [0.66, 0.33]) {
        const health = game.world.getComponent(boss, "Health");
        if (!health) throw new Error("Expected boss health");
        setHealth(game.world, boss, Math.floor(health.max * ratio));
        for (let step = 0; step < 5; step += 1) game.update(1 / 60);
      }

      return hashSoA(game.world.snapshot() as SoAWorldSnapshot);
    };

    const first = await run();
    const second = await run();
    expect(first).toBe(second);
    expect(first.length).toBe(8);
  });
});
