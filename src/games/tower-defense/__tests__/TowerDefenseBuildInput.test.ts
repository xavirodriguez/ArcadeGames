import { TowerDefenseGame } from "../TowerDefenseGame";
import type { GameStateComponent } from "../types/TowerDefenseTypes";

describe("TowerDefense BuildInput System", () => {
  let game: TowerDefenseGame;

  beforeEach(async () => {
    game = new TowerDefenseGame({ headless: true, seed: 42 });
    await game.init();
  });

  afterEach(() => {
    game.destroy();
  });

  it("resets build flag and does not build on path cell (col 1, row 1)", () => {
    // Path cell: col 1, row 1 -> cursorX: 140, cursorY: 100
    game.setInputState({
      cursorX: 140,
      cursorY: 100,
      selectedTowerType: "basic",
      build: true,
    });

    game.update(1 / 60);

    const world = game.getWorld();
    const playerEntity = world.query("Player")[0];
    const input = world.getComponent(playerEntity, "Input");
    expect(input?.build).toBe(false);

    let towers = world.query("Tower");
    expect(towers.length).toBe(0);

    // Add gold and run more updates -> still no tower should spawn
    world.mutateSingleton("GameState", (g: GameStateComponent) => {
      g.gold += 500;
    });
    game.update(1 / 60);
    game.update(1 / 60);

    towers = world.query("Tower");
    expect(towers.length).toBe(0);
  });

  it("resets build flag when build fails due to insufficient gold", () => {
    const world = game.getWorld();
    // Set gold to 0
    world.mutateSingleton("GameState", (g: GameStateComponent) => {
      g.gold = 0;
    });

    // Buildable cell: col 2, row 2 -> cursorX: 180, cursorY: 140
    game.setInputState({
      cursorX: 180,
      cursorY: 140,
      selectedTowerType: "basic",
      build: true,
    });

    game.update(1 / 60);

    const playerEntity = world.query("Player")[0];
    const input = world.getComponent(playerEntity, "Input");
    expect(input?.build).toBe(false);
    expect(world.query("Tower").length).toBe(0);

    // Restore gold and update -> no tower should spawn
    world.mutateSingleton("GameState", (g: GameStateComponent) => {
      g.gold = 150;
    });
    game.update(1 / 60);
    expect(world.query("Tower").length).toBe(0);
  });

  it("resets build flag when trying to build on an occupied cell", () => {
    const world = game.getWorld();

    // First build a valid tower at col 2, row 2
    game.setInputState({
      cursorX: 180,
      cursorY: 140,
      selectedTowerType: "basic",
      build: true,
    });
    game.update(1 / 60);

    expect(world.query("Tower").length).toBe(1);
    const goldAfterFirstBuild = (world.getSingleton("GameState") as GameStateComponent).gold;

    // Try to build again on the same cell
    game.setInputState({
      cursorX: 180,
      cursorY: 140,
      selectedTowerType: "basic",
      build: true,
    });
    game.update(1 / 60);

    const playerEntity = world.query("Player")[0];
    const input = world.getComponent(playerEntity, "Input");
    expect(input?.build).toBe(false);
    expect(world.query("Tower").length).toBe(1);
    expect((world.getSingleton("GameState") as GameStateComponent).gold).toBe(goldAfterFirstBuild);
  });

  it("processes upgrade in the same frame even if build fails", () => {
    const world = game.getWorld();

    // First build a valid tower at col 2, row 2
    game.setInputState({
      cursorX: 180,
      cursorY: 140,
      selectedTowerType: "basic",
      build: true,
    });
    game.update(1 / 60);

    const towerEntity = world.query("Tower")[0];
    const towerBefore = world.getComponent(towerEntity, "Tower");
    expect(towerBefore?.level).toBe(1);

    // Now issue both build (which will fail because occupied) and upgrade in the same frame
    game.setInputState({
      cursorX: 180,
      cursorY: 140,
      selectedTowerType: "basic",
      build: true,
      upgrade: true,
    });
    game.update(1 / 60);

    const towerAfter = world.getComponent(towerEntity, "Tower");
    expect(towerAfter?.level).toBe(2);

    const playerEntity = world.query("Player")[0];
    const input = world.getComponent(playerEntity, "Input");
    expect(input?.build).toBe(false);
    expect(input?.upgrade).toBe(false);
  });

  it("successfully builds on a valid buildable cell and deducts gold", () => {
    const world = game.getWorld();
    const initialGold = (world.getSingleton("GameState") as GameStateComponent).gold;

    // Buildable cell col 2, row 2
    game.setInputState({
      cursorX: 180,
      cursorY: 140,
      selectedTowerType: "basic",
      build: true,
    });
    game.update(1 / 60);

    expect(world.query("Tower").length).toBe(1);
    const newGold = (world.getSingleton("GameState") as GameStateComponent).gold;
    expect(newGold).toBe(initialGold - 50);

    const playerEntity = world.query("Player")[0];
    const input = world.getComponent(playerEntity, "Input");
    expect(input?.build).toBe(false);
  });
});
