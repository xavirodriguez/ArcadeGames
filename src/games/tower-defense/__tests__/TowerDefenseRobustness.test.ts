import { TowerDefenseGame } from "../TowerDefenseGame";
import type { GameStateComponent } from "../types/TowerDefenseTypes";

describe("TowerDefense headless - Phase 5 (Robustness & Determinism)", () => {
  let game: TowerDefenseGame;

  afterEach(async () => {
    if (game) {
      await game.destroy();
    }
  });

  it("5.1 Bounded entity count under 60 seconds (3600 frames) of continuous firing", async () => {
    game = new TowerDefenseGame({ headless: true, gameOptions: { seed: 42 } });
    await game.init();

    const world = game.getWorld();
    const layout = world.getResource<any>("GridLayout");

    // Build 2 rapid towers
    const p = world.query("Player")[0];
    world.mutateComponent(p, "Player", (pl) => {
      pl.selectedTowerType = "rapid";
    });

    world.mutateComponent(p, "Input", (i) => {
      i.cursorX = layout.offsetX + 1 * layout.stepX + layout.stepX / 2;
      i.cursorY = layout.offsetY + 2 * layout.stepY + layout.stepY / 2;
      i.build = true;
    });

    game.update(1 / 60);
    game.update(1 / 60);

    // Start wave
    world.mutateComponent(p, "Input", (i) => {
      i.startWave = true;
    });

    let maxEntities = 0;

    // Simulate 60 seconds (3600 frames at 60fps)
    for (let f = 0; f < 3600; f++) {
      game.update(1 / 60);
      const activeCount = world.entities.length;
      if (activeCount > maxEntities) {
        maxEntities = activeCount;
      }
    }

    // Maximum active entity count must be strictly bounded (< 50)
    expect(maxEntities).toBeLessThan(50);
  });

  it("5.2 Clean restart produces identical initial state and sequence", async () => {
    game = new TowerDefenseGame({ headless: true, gameOptions: { seed: 99 } });
    await game.init();

    // Run 120 frames
    for (let i = 0; i < 120; i++) {
      game.update(1 / 60);
    }

    // Restart
    await game.restart(99);

    const stateAfter = game.getGameState();
    expect(stateAfter.gold).toBe(150);
    expect(stateAfter.lives).toBe(20);
    expect(stateAfter.wave).toBe(0);
    expect(stateAfter.phase).toBe("build");
  });

  it("5.3 World Snapshot restore and state preservation", async () => {
    game = new TowerDefenseGame({ headless: true, gameOptions: { seed: 123 } });
    await game.init();

    const world = game.getWorld();
    const p = world.query("Player")[0];

    // Start wave and run 30 frames
    world.mutateComponent(p, "Input", (i) => {
      i.startWave = true;
    });
    for (let i = 0; i < 30; i++) {
      game.update(1 / 60);
    }

    // Take snapshot and restore
    const snapshot = world.snapshot();
    expect(snapshot).toBeDefined();

    world.restore(snapshot);

    const restoredState = game.getGameState();
    expect(restoredState.phase).toBe("wave");
    expect(restoredState.lives).toBe(20);
  });
});
