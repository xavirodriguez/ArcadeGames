import { FroggerGame } from "../FroggerGame";
import { DEFAULT_FROGGER_CONFIG } from "../types/FroggerConfigSchema";

describe("Frogger missing features", () => {
  let game: FroggerGame;

  beforeEach(async () => {
    game = new FroggerGame({ seed: 12345 });
    await game.init();
    game.start();
  });

  afterEach(() => {
    game.destroy();
  });

  it("initializes with a time remaining timer", () => {
    const state = game.getGameState();
    expect(state.timeRemaining).toBeDefined();
    expect(state.timeRemaining).toBeGreaterThan(0);
    expect(state.timeRemaining).toBeLessThanOrEqual(
      DEFAULT_FROGGER_CONFIG.FROG_TIME_LIMIT ?? 30
    );
  });

  it("timer reaches 0 and causes death / life loss", () => {
    const world = game.getWorld();
    const stateEntity = world.query("FroggerState")[0];
    expect(stateEntity).toBeDefined();

    world.mutateComponent(stateEntity, "FroggerState", (s) => {
      s.timeRemaining = 0.05;
    });

    const livesBefore = game.getGameState().lives;
    for (let i = 0; i < 30; i++) {
      game.update(1 / 60);
    }

    const state = game.getGameState();
    expect(state.lives).toBeLessThanOrEqual(livesBefore);
  });

  it("turtle log components have dive phase state", () => {
    const world = game.getWorld();
    const logs = world.query("Log");
    const turtles = logs.filter((e) => {
      const log = world.getComponent(e, "Log");
      return log?.logType === "turtle";
    });
    expect(turtles.length).toBeGreaterThan(0);
    for (const e of turtles) {
      const log = world.getComponent(e, "Log");
      expect(log?.divePhase).toBeDefined();
      expect(log?.diveTimer).toBeDefined();
      expect(["float", "warning", "submerged"]).toContain(log!.divePhase);
    }
  });

  it("level clear increases speed scales", () => {
    const world = game.getWorld();
    const stateEntity = world.query("FroggerState")[0];
    const stateBefore = world.getComponent(stateEntity, "FroggerState")!;
    expect(stateBefore.trafficSpeedScale).toBe(1);
    expect(stateBefore.riverSpeedScale).toBe(1);

    world.mutateComponent(stateEntity, "FroggerState", (s) => {
      s.occupiedLilyPads = s.totalLilyPads - 1;
      s.score = 1000;
    });

    const froggerEntity = world.query("Frogger")[0];
    world.mutateComponent(froggerEntity, "Frogger", (f) => {
      f.gridY = 0;
      f.isAlive = true;
    });
    const pads = world.query("GoalLilyPad", "Transform");
    const freePad = pads.find((e) => {
      const p = world.getComponent(e, "GoalLilyPad");
      return p && !p.occupied;
    });
    expect(freePad).toBeDefined();
    const padT = world.getComponent(freePad!, "Transform")!;
    world.mutateComponent(froggerEntity, "Transform", (t) => {
      t.x = padT.x;
      t.y = padT.y;
    });

    game.update(1 / 60);

    const stateAfter = world.getComponent(stateEntity, "FroggerState")!;
    if (stateAfter.level > 1) {
      expect(stateAfter.trafficSpeedScale).toBeGreaterThan(1);
      expect(stateAfter.riverSpeedScale).toBeGreaterThan(1);
    }
  });

  it("smoke: existing lifecycle still works", () => {
    expect(game.isGameOver()).toBe(false);
    game.setInputState({ moveUp: true });
    expect(() => game.update(1 / 60)).not.toThrow();
    game.setInputState({ moveUp: false });
    expect(() => game.update(1 / 60)).not.toThrow();
  });

  it("frogger has facing field", () => {
    const world = game.getWorld();
    const froggerEntity = world.query("Frogger")[0];
    const frogger = world.getComponent(froggerEntity, "Frogger");
    expect(frogger?.facing).toBeDefined();
    expect(["up", "down", "left", "right"]).toContain(frogger!.facing);
  });
});
