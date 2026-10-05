import { TowerDefenseGame } from "../TowerDefenseGame";
import { parseLevelLayout, extractWaypoints, createGridLayout } from "../MapUtils";
import type { GameStateComponent, WaypointList, TileGrid } from "../types/TowerDefenseTypes";
import towerDefenseConfigRaw from "../config/tower-defense.json";

describe("TowerDefense headless - Phase 2 (Playable Headless)", () => {
  let game: TowerDefenseGame;

  afterEach(async () => {
    if (game) {
      await game.destroy();
    }
  });

  it("2.1 Map layout validation: extractWaypoints returns connected path and throws clear error on broken map", async () => {
    game = new TowerDefenseGame({ headless: true, gameOptions: { seed: 42 } });
    await game.init();
    const waypoints = game.getWorld().getResource<WaypointList>("WaypointList");
    expect(waypoints).toBeDefined();
    expect(waypoints!.points.length).toBe(26);

    // Test invalid layout
    const invalidGrid: TileGrid = {
      cols: 4,
      rows: 4,
      tiles: [
        ["spawn", "blocked", "blocked", "blocked"],
        ["blocked", "blocked", "blocked", "blocked"],
        ["blocked", "blocked", "blocked", "blocked"],
        ["blocked", "blocked", "blocked", "base"],
      ],
    };
    const layout = createGridLayout(towerDefenseConfigRaw as any);
    expect(() => extractWaypoints(invalidGrid, layout)).toThrow(
      "[TD] Invalid map layout: No walkable path from spawn (S) to base (E)"
    );
  });

  it("2.2 Time units: spawns expected creeps over simulated time", async () => {
    game = new TowerDefenseGame({ headless: true, gameOptions: { seed: 42 } });
    await game.init();

    // Start wave 1
    const player = game.getWorld().query("Player")[0];
    game.getWorld().mutateComponent(player, "Input", (i) => {
      i.startWave = true;
    });

    // Wave 1 has 8 grunts with 0.9s interval -> total time ~ 6.3s
    // Simulate 10 seconds (600 frames at 1/60s)
    for (let i = 0; i < 600; i++) {
      game.update(1 / 60);
    }

    const director = game.getWorld().query("SpawnDirector")[0];
    const sd = game.getWorld().getComponent(director, "SpawnDirector");
    // All 8 pending spawns should have been issued
    expect(sd?.pendingSpawns.length).toBe(0);
  });

  it("2.3 Structural mutations: building and spawning during update run without guard errors", async () => {
    game = new TowerDefenseGame({ headless: true, gameOptions: { seed: 42 } });
    await game.init();

    const player = game.getWorld().query("Player")[0];
    // Build tower at (col 1, row 3) which is buildable
    const layout = game.getWorld().getResource<any>("GridLayout");
    const cellX = layout.offsetX + 1 * layout.stepX + layout.stepX / 2;
    const cellY = layout.offsetY + 3 * layout.stepY + layout.stepY / 2;

    game.getWorld().mutateComponent(player, "Input", (i) => {
      i.cursorX = cellX;
      i.cursorY = cellY;
      i.build = true;
    });

    expect(() => {
      for (let i = 0; i < 5; i++) {
        game.update(1 / 60);
      }
    }).not.toThrow();

    const towers = game.getWorld().query("Tower");
    expect(towers.length).toBe(1);
  });

  it("2.5 Single owner movement: creep speed matches configured speed over simulated time", async () => {
    game = new TowerDefenseGame({ headless: true, gameOptions: { seed: 42 } });
    await game.init();

    // Start wave to spawn a creep (Grunt speed = 60 px/s)
    const player = game.getWorld().query("Player")[0];
    game.getWorld().mutateComponent(player, "Input", (i) => {
      i.startWave = true;
    });

    // Tick 1 (GameStateSystem sets phase=wave), Tick 2 (WaveSpawnSystem enqueues spawn), Tick 3 (Command buffer creates creep)
    game.update(1 / 60);
    game.update(1 / 60);
    game.update(1 / 60);

    const creeps = game.getWorld().query("Creep");
    expect(creeps.length).toBe(1);

    const initialTransform = { ...game.getWorld().getComponent(creeps[0], "Transform")! };

    // Simulate 1.0 second (60 frames at 1/60)
    for (let i = 0; i < 60; i++) {
      game.update(1 / 60);
    }

    const newTransform = game.getWorld().getComponent(creeps[0], "Transform")!;
    const dx = newTransform.x - initialTransform.x;
    const dy = newTransform.y - initialTransform.y;
    const distMoved = Math.sqrt(dx * dx + dy * dy);

    // Grunt speed is 60 px/s. Over 1s, it should move ~60 px (within 2px tolerance)
    expect(distMoved).toBeGreaterThanOrEqual(58);
    expect(distMoved).toBeLessThanOrEqual(62);
  });

  it("2.6 Wave cycle: transitions through build -> wave -> intermission -> build", async () => {
    game = new TowerDefenseGame({ headless: true, gameOptions: { seed: 42 } });
    await game.init();

    let gs = game.getGameState();
    expect(gs.phase).toBe("build");
    expect(gs.wave).toBe(0);

    // Start wave 0
    const player = game.getWorld().query("Player")[0];
    game.getWorld().mutateComponent(player, "Input", (i) => {
      i.startWave = true;
    });

    // Run 3 ticks to start wave and process spawn
    game.update(1 / 60);
    game.update(1 / 60);
    game.update(1 / 60);
    gs = game.getGameState();
    expect(gs.phase).toBe("wave");

    // Clear pending spawns and live creeps to simulate wave cleared
    const director = game.getWorld().query("SpawnDirector")[0];
    game.getWorld().mutateComponent(director, "SpawnDirector", (sd) => {
      sd.pendingSpawns = [];
    });
    const creeps = game.getWorld().query("Creep");
    for (const c of creeps) {
      game.getWorld().commands.removeEntity(c);
    }

    // Tick to allow WaveSpawnSystem and GameStateSystem to process wave completion
    game.update(1 / 60);
    game.update(1 / 60);

    gs = game.getGameState();
    expect(gs.phase).toBe("intermission");
    expect(gs.wave).toBe(1);

    // Fast forward intermission (5s = 300 ticks)
    for (let i = 0; i < 310; i++) {
      game.update(1 / 60);
    }

    gs = game.getGameState();
    expect(gs.phase).toBe("build");
    expect(gs.wave).toBe(1);
  });
});
