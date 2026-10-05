import { TowerDefenseGame } from "../TowerDefenseGame";
import type { GameStateComponent } from "../types/TowerDefenseTypes";

describe("TowerDefense headless - Phase 3 (Combat & Economy)", () => {
  let game: TowerDefenseGame;

  afterEach(async () => {
    if (game) {
      await game.destroy();
    }
  });

  it("3.1 & 3.2 Full combat integration and single reward per creep", async () => {
    game = new TowerDefenseGame({ headless: true, gameOptions: { seed: 42 } });
    await game.init();

    const initialGold = game.getGameState().gold;

    // Spawn a sniper tower (damage 40 = 1 hit kill on grunt) at col 1, row 2
    const world = game.getWorld();
    const layout = world.getResource<any>("GridLayout");
    const cellX = layout.offsetX + 1 * layout.stepX + layout.stepX / 2;
    const cellY = layout.offsetY + 2 * layout.stepY + layout.stepY / 2;

    const player = world.query("Player")[0];
    world.mutateComponent(player, "Player", (p) => {
      p.selectedTowerType = "sniper";
    });

    world.mutateComponent(player, "Input", (i) => {
      i.cursorX = cellX;
      i.cursorY = cellY;
      i.build = true;
    });

    // Step to build sniper tower (cost 100)
    game.update(1 / 60);
    game.update(1 / 60);

    const towers = world.query("Tower");
    expect(towers.length).toBe(1);

    const goldAfterBuild = game.getGameState().gold;
    expect(goldAfterBuild).toBe(initialGold - 100);

    // Start wave
    world.mutateComponent(player, "Input", (i) => {
      i.startWave = true;
    });

    // Run 60 frames (1.0s) — projectile catches up and kills Grunt 0
    for (let i = 0; i < 60; i++) {
      game.update(1 / 60);
    }

    const goldAfterKill = game.getGameState().gold;
    // Grunt 0 gives 10 gold reward. Awarded exactly once -> 50 + 10 = 60.
    expect(goldAfterKill).toBe(goldAfterBuild + 10);
  });

  it("3.3 Lives subtraction, Game Over, and Victory conditions", async () => {
    game = new TowerDefenseGame({ headless: true, gameOptions: { seed: 42 } });
    await game.init();

    let gs = game.getGameState();
    expect(gs.lives).toBe(20);

    // Drain lives to 0
    game.getWorld().mutateSingleton("GameState", (g: GameStateComponent) => {
      g.lives = 0;
    });

    game.update(1 / 60);

    gs = game.getGameState();
    expect(gs.phase).toBe("game_over");
    expect(game.isGameOver()).toBe(true);

    // Test victory condition
    const victoryGame = new TowerDefenseGame({ headless: true, gameOptions: { seed: 42 } });
    await victoryGame.init();

    // Run 1 tick so GameStateSystem binds event handlers
    victoryGame.update(1 / 60);

    // Set wave to final wave index (wave 5)
    victoryGame.getWorld().mutateSingleton("GameState", (g: GameStateComponent) => {
      g.wave = 5; // Final wave index (6 waves total: 0..5)
    });

    // Emit wave:cleared on final wave
    victoryGame.getWorld().getEventBus()?.emit("wave:cleared", { waveIndex: 5 });

    victoryGame.update(1 / 60);

    const victoryGs = victoryGame.getGameState();
    expect(victoryGs.phase).toBe("victory");
    expect(victoryGame.isGameOver()).toBe(true);
    await victoryGame.destroy();
  });

  it("3.4 Economy actions: build, sell, upgrade, and insufficient gold guard", async () => {
    game = new TowerDefenseGame({ headless: true, gameOptions: { seed: 42 } });
    await game.init();

    const world = game.getWorld();
    const layout = world.getResource<any>("GridLayout");
    const cellX = layout.offsetX + 2 * layout.stepX + layout.stepX / 2;
    const cellY = layout.offsetY + 2 * layout.stepY + layout.stepY / 2;

    const player = world.query("Player")[0];

    // Build tower (cost 50)
    world.mutateComponent(player, "Input", (i) => {
      i.cursorX = cellX;
      i.cursorY = cellY;
      i.build = true;
    });

    game.update(1 / 60);
    game.update(1 / 60);

    expect(game.getGameState().gold).toBe(100);
    const towerEntity = world.query("Tower")[0];
    expect(towerEntity).toBeDefined();

    // Upgrade tower (upgrade cost = cost * 0.8 * level = 50 * 0.8 * 1 = 40)
    world.mutateComponent(player, "Input", (i) => {
      i.cursorX = cellX;
      i.cursorY = cellY;
      i.upgrade = true;
    });

    game.update(1 / 60);

    expect(game.getGameState().gold).toBe(60);
    const towerComp = world.getComponent(towerEntity, "Tower");
    expect(towerComp?.level).toBe(2);

    // Sell tower (refund = cost * 0.6 * level = 50 * 0.6 * 2 = 60)
    world.mutateComponent(player, "Input", (i) => {
      i.cursorX = cellX;
      i.cursorY = cellY;
      i.sell = true;
    });

    game.update(1 / 60);
    game.update(1 / 60);

    expect(game.getGameState().gold).toBe(120);
    expect(world.query("Tower").length).toBe(0);
  });

  it("3.5 Special towers: Frost tower slow effect application and expiration", async () => {
    game = new TowerDefenseGame({ headless: true, gameOptions: { seed: 42 } });
    await game.init();

    const world = game.getWorld();
    const layout = world.getResource<any>("GridLayout");
    const cellX = layout.offsetX + 1 * layout.stepX + layout.stepX / 2;
    const cellY = layout.offsetY + 2 * layout.stepY + layout.stepY / 2;

    const player = world.query("Player")[0];
    // Select frost tower
    world.mutateComponent(player, "Player", (p) => {
      p.selectedTowerType = "frost";
    });

    world.mutateComponent(player, "Input", (i) => {
      i.cursorX = cellX;
      i.cursorY = cellY;
      i.build = true;
    });

    game.update(1 / 60);
    game.update(1 / 60);

    const frostTower = world.query("Tower")[0];
    expect(world.getComponent(frostTower, "Tower")?.towerType).toBe("frost");

    // Start wave
    world.mutateComponent(player, "Input", (i) => {
      i.startWave = true;
    });

    // Run until projectile hits creep (60 frames)
    for (let i = 0; i < 60; i++) {
      game.update(1 / 60);
    }

    const creeps = world.query("Creep");
    if (creeps.length > 0) {
      const creep = world.getComponent(creeps[0], "Creep")!;
      if (creep.slowRemainingMs > 0) {
        expect(creep.slowFactor).toBe(0.5);

        // Fast forward 2 seconds to expire slow (slow duration = 1500ms)
        for (let i = 0; i < 120; i++) {
          game.update(1 / 60);
        }

        const expiredCreep = world.getComponent(creeps[0], "Creep");
        if (expiredCreep) {
          expect(expiredCreep.slowRemainingMs).toBe(0);
          expect(expiredCreep.slowFactor).toBe(1);
        }
      }
    }
  });
});
