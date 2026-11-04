import { FroggerGame } from "../FroggerGame";
import { DEFAULT_FROGGER_CONFIG } from "../types/FroggerConfigSchema";
import type { FroggerConfig } from "../types/FroggerConfigSchema";

describe("Frogger Lifecycle Safety Net", () => {
  let game: FroggerGame;

  beforeEach(async () => {
    game = new FroggerGame({ seed: 54321 });
    await game.init();
    game.start();
  });

  afterEach(() => {
    game.destroy();
  });

  it("initializes state and processes grid movement inputs", () => {
    expect(game.isGameOver()).toBe(false);
    const state = game.getGameState();
    expect(state.lives).toBe(3);
    expect(state.score).toBe(0);

    // Simulate jump up
    game.setInputState({ moveUp: true });
    expect(() => game.update(1 / 60)).not.toThrow();

    game.setInputState({ moveUp: false });
    expect(() => game.update(1 / 60)).not.toThrow();
  });

  it("refreshes cached world coordinates after a discrete grid jump", () => {
    const world = game.getWorld();
    const froggerEntity = world.query("Frogger", "Transform")[0];
    const froggerBefore = world.getComponent(froggerEntity, "Frogger");
    expect(froggerBefore).toBeDefined();

    game.setInputState({ moveUp: true });
    game.update(1 / 60);
    game.setInputState({ moveUp: false });

    const froggerAfter = world.getComponent(froggerEntity, "Frogger");
    const transform = world.getComponent(froggerEntity, "Transform");
    expect(froggerAfter).toBeDefined();
    expect(transform).toBeDefined();
    expect(froggerAfter!.gridY).toBe(froggerBefore!.gridY - 1);
    expect(transform!.worldX).toBe(transform!.x);
    expect(transform!.worldY).toBe(transform!.y);
    expect(transform!.dirty).toBe(false);
  });

  it("refreshes cached world coordinates when a river log carries the frog", () => {
    const world = game.getWorld();
    const config = world.getResource<FroggerConfig>("GameConfig") ?? DEFAULT_FROGGER_CONFIG;
    const logEntity = world.query("Log", "Transform", "Velocity").find((entity) => {
      const log = world.getComponent(entity, "Log");
      return log?.laneY === 2 && log.logType === "log";
    });
    expect(logEntity).toBeDefined();

    const logTransform = world.getComponent(logEntity!, "Transform");
    expect(logTransform).toBeDefined();
    const froggerEntity = world.query("Frogger", "Transform")[0];

    world.mutateComponent(froggerEntity, "Frogger", (frogger) => {
      frogger.gridX = Math.floor(logTransform!.x / config.GRID_SIZE);
      frogger.gridY = 2;
      frogger.isAlive = true;
      frogger.isRiding = false;
      frogger.logEntity = undefined;
      frogger.cooldownRemaining = 0;
      frogger.invulnerableRemaining = 2;
    });
    world.mutateComponent(froggerEntity, "Transform", (transform) => {
      transform.x = logTransform!.x;
      transform.y = 2 * config.GRID_SIZE + config.GRID_SIZE / 2;
      transform.worldX = transform.x;
      transform.worldY = transform.y;
      transform.dirty = false;
    });

    game.update(1 / 60);

    const frogger = world.getComponent(froggerEntity, "Frogger");
    const transform = world.getComponent(froggerEntity, "Transform");
    expect(frogger?.isRiding).toBe(true);
    expect(transform).toBeDefined();
    expect(transform!.worldX).toBeCloseTo(transform!.x);
    expect(transform!.worldY).toBeCloseTo(transform!.y);
    expect(transform!.dirty).toBe(false);
  });

  it("refreshes cached world coordinates after respawning from another grid cell", () => {
    const world = game.getWorld();
    const config = world.getResource<FroggerConfig>("GameConfig") ?? DEFAULT_FROGGER_CONFIG;
    const froggerEntity = world.query("Frogger", "Transform")[0];

    world.mutateComponent(froggerEntity, "Frogger", (frogger) => {
      frogger.gridX = 2;
      frogger.gridY = 10;
      frogger.isAlive = false;
      frogger.isRiding = false;
      frogger.logEntity = undefined;
    });
    world.mutateComponent(froggerEntity, "Transform", (transform) => {
      transform.x = 2 * config.GRID_SIZE + config.GRID_SIZE / 2;
      transform.y = 10 * config.GRID_SIZE + config.GRID_SIZE / 2;
      transform.worldX = transform.x;
      transform.worldY = transform.y;
      transform.dirty = false;
    });

    for (let tick = 0; tick < 40; tick += 1) {
      game.update(1 / 60);
    }

    const frogger = world.getComponent(froggerEntity, "Frogger");
    const transform = world.getComponent(froggerEntity, "Transform");
    const startX = Math.floor(config.TOTAL_COLS / 2) * config.GRID_SIZE + config.GRID_SIZE / 2;
    const startY = 13 * config.GRID_SIZE + config.GRID_SIZE / 2;

    expect(frogger?.isAlive).toBe(true);
    expect(frogger?.gridY).toBe(13);
    expect(transform).toBeDefined();
    expect(transform!.x).toBe(startX);
    expect(transform!.y).toBe(startY);
    expect(transform!.worldX).toBe(startX);
    expect(transform!.worldY).toBe(startY);
    expect(transform!.dirty).toBe(false);
  });

  it("runs 120 simulation ticks and restarts cleanly", async () => {
    for (let i = 0; i < 120; i++) {
      game.update(1 / 60);
    }
    expect(game.isGameOver()).toBe(false);

    await expect(game.restart()).resolves.not.toThrow();
    expect(game.getGameState().score).toBe(0);
  });
});
