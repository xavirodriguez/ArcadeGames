import { TowerDefenseGame } from "../TowerDefenseGame";
import type { GameStateComponent } from "../types/TowerDefenseTypes";

describe("TowerDefense Wave 1 & 2 Balance Simulation", () => {
  let game: TowerDefenseGame;

  beforeEach(async () => {
    game = new TowerDefenseGame({ headless: true, seed: 42 });
    await game.init();
  });

  afterEach(() => {
    game.destroy();
  });

  it("simulates Wave 1 and Wave 2 with 3 basic towers placed near path", () => {
    const world = game.getWorld();

    // With 150 gold, place 3 basic towers (50 gold each) at buildable cells adjacent to the top path row (row 1):
    // Cell (col 2, row 2) -> center: (180, 140)
    // Cell (col 4, row 2) -> center: (260, 140)
    // Cell (col 6, row 2) -> center: (340, 140)
    const towerPositions = [
      { cursorX: 180, cursorY: 140 },
      { cursorX: 260, cursorY: 140 },
      { cursorX: 340, cursorY: 140 },
    ];

    for (const pos of towerPositions) {
      game.setInputState({
        cursorX: pos.cursorX,
        cursorY: pos.cursorY,
        selectedTowerType: "basic",
        build: true,
      });
      game.update(1 / 60);
    }

    expect(world.query("Tower").length).toBe(3);
    const gsAfterBuild = world.getSingleton("GameState") as GameStateComponent;
    expect(gsAfterBuild.gold).toBe(0);

    // Start Wave 1
    game.setInputState({ startWave: true });
    game.update(1 / 60);

    // Simulate Wave 1 until phase returns to 'intermission' or 'build' or game over
    let dt = 1 / 60;
    let maxSteps = 3000; // ~50s at 60fps
    while (maxSteps-- > 0) {
      game.update(dt);
      const gs = world.getSingleton("GameState") as GameStateComponent;
      if (gs.phase === "intermission" || gs.phase === "build" || gs.phase === "game_over") {
        break;
      }
    }

    const gsWave1 = world.getSingleton("GameState") as GameStateComponent;
    const killsWave1 = world.query("Creep").length; // creeps remaining on screen

    console.log("Wave 1 Simulation Result:", {
      phase: gsWave1.phase,
      lives: gsWave1.lives,
      livesLost: 20 - gsWave1.lives,
      gold: gsWave1.gold,
      creepsAlive: killsWave1,
    });

    // Check wave 1 results
    expect(gsWave1.lives).toBeGreaterThan(0);

    // Now test Wave 2 using remaining gold + Wave 1 rewards
    // If enough gold for 1 more tower, build it at col 8, row 2 (420, 140)
    if (gsWave1.gold >= 50) {
      game.setInputState({
        cursorX: 420,
        cursorY: 140,
        selectedTowerType: "basic",
        build: true,
      });
      game.update(1 / 60);
    }

    game.setInputState({ startWave: true });
    game.update(1 / 60);

    maxSteps = 3000;
    while (maxSteps-- > 0) {
      game.update(dt);
      const gs = world.getSingleton("GameState") as GameStateComponent;
      if (gs.phase === "intermission" || gs.phase === "build" || gs.phase === "game_over") {
        break;
      }
    }

    const gsWave2 = world.getSingleton("GameState") as GameStateComponent;
    console.log("Wave 2 Simulation Result:", {
      phase: gsWave2.phase,
      lives: gsWave2.lives,
      livesLost: 20 - gsWave2.lives,
      gold: gsWave2.gold,
      creepsAlive: world.query("Creep").length,
    });
  });
});
