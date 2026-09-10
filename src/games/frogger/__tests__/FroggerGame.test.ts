import { TransformComponent } from "@tiny-aster/core";
import { FroggerGame } from "../FroggerGame";

describe("FroggerGame Engine & Mechanics", () => {
  let game: FroggerGame;

  beforeEach(async () => {
    game = new FroggerGame({ seed: 12345 });
    await game.init();
    game.start();
  });

  afterEach(() => {
    game.stop();
  });

  it("initializes with correct default state", () => {
    const state = game.getGameState();
    expect(state.score).toBe(0);
    expect(state.lives).toBe(3);
    expect(state.level).toBe(1);
    expect(state.isGameOver).toBe(false);
    expect(state.occupiedLilyPads).toBe(0);
    expect(state.totalLilyPads).toBe(5);
  });

  it("handles grid jump inputs correctly and enforces discrete hops", () => {
    const world = game.getWorld();
    const froggerEntity = world.query("Frogger")[0];
    let frogger = world.getComponent(froggerEntity, "Frogger");
    expect(frogger?.gridY).toBe(13);

    // Initial press moveUp -> Jump Up once
    game.setInput({ moveUp: true });
    game.update(0.016);

    frogger = world.getComponent(froggerEntity, "Frogger");
    expect(frogger?.gridY).toBe(12);

    // Holding moveUp across multiple frames should NOT trigger subsequent jumps
    for (let i = 0; i < 20; i++) {
      game.update(0.016);
    }
    frogger = world.getComponent(froggerEntity, "Frogger");
    expect(frogger?.gridY).toBe(12);

    // Releasing moveUp and pressing it again triggers second jump
    game.setInput({ moveUp: false });
    game.update(0.016);
    game.setInput({ moveUp: true });
    game.update(0.016);

    frogger = world.getComponent(froggerEntity, "Frogger");
    expect(frogger?.gridY).toBe(11);

    const state = game.getGameState();
    expect(state.score).toBeGreaterThan(0);
  });

  it("wraps vehicle entities smoothly considering minX and maxX boundaries", () => {
    const world = game.getWorld();
    const vehicles = world.query("Vehicle", "Transform", "Boundary");
    expect(vehicles.length).toBeGreaterThan(0);

    const vEntity = vehicles[0];
    const b = world.getComponent(vEntity, "Boundary");
    expect(b?.minX).toBeDefined();
    expect(b?.maxX).toBeDefined();

    // Position entity past minX to trigger wrapping to maxX
    world.mutateComponent(vEntity, "Transform", (t) => {
      t.x = (b?.minX ?? 0) - 5;
    });

    game.update(0.016);

    const updatedTransform = world.getComponent(vEntity, "Transform");
    expect(updatedTransform?.x).toBe(b?.maxX);
  });

  it("carries frogger horizontally when standing on a log in the river", () => {
    const world = game.getWorld();
    const froggerEntity = world.query("Frogger", "Transform")[0];

    // Position Frogger onto Row 2 on top of a log
    const logEntities = world.query("Log", "Transform");
    const log2 = logEntities.find((e) => {
      const log = world.getComponent(e, "Log");
      return log?.laneY === 2;
    });

    expect(log2).toBeDefined();
    const logTransform = world.getComponent(log2!, "Transform") as TransformComponent;

    world.mutateComponent(froggerEntity, "Frogger", (f) => {
      f.gridY = 2;
      f.gridX = Math.floor(logTransform.x / 40);
      f.isAlive = true;
    });
    world.mutateComponent(froggerEntity, "Transform", (t: any) => {
      t.x = logTransform.x;
      t.y = 2 * 40 + 20;
    });

    const initialX = logTransform.x;
    game.update(0.1);

    const updatedTransform = world.getComponent(froggerEntity, "Transform") as TransformComponent;
    const frogger = world.getComponent(froggerEntity, "Frogger");

    expect(frogger?.isRiding).toBe(true);
    expect(updatedTransform.x).not.toBe(initialX);
  });

  it("causes drowning death when in river rows without standing on a log", () => {
    const world = game.getWorld();
    const froggerEntity = world.query("Frogger", "Transform")[0];

    // Position Frogger in Row 1 at an x where there is no log/turtle
    world.mutateComponent(froggerEntity, "Frogger", (f) => {
      f.gridY = 1;
      f.isAlive = true;
    });
    world.mutateComponent(froggerEntity, "Transform", (t: any) => {
      t.x = 780; // Far right where no turtle is
      t.y = 1 * 40 + 20;
    });

    game.update(0.016);

    const frogger = world.getComponent(froggerEntity, "Frogger");
    expect(frogger?.isAlive).toBe(false);

    // Update to allow respawn timer to trigger life deduction
    game.update(0.6);
    const state = game.getGameState();
    expect(state.lives).toBe(2);
  });

  it("occupies lily pad when reaching row 0", () => {
    const world = game.getWorld();
    const froggerEntity = world.query("Frogger", "Transform")[0];

    // Move Frogger directly over Lily Pad 0 (x = 133.33)
    const padEntities = world.query("GoalLilyPad", "Transform");
    const pad0Transform = world.getComponent(padEntities[0], "Transform") as TransformComponent;

    world.mutateComponent(froggerEntity, "Frogger", (f) => {
      f.gridY = 0;
      f.isAlive = true;
    });
    world.mutateComponent(froggerEntity, "Transform", (t: any) => {
      t.x = pad0Transform.x;
      t.y = 20;
    });

    game.update(0.016);

    const state = game.getGameState();
    expect(state.occupiedLilyPads).toBe(1);
    expect(state.score).toBeGreaterThanOrEqual(500);

    // Frogger should reset position to start
    const frogger = world.getComponent(froggerEntity, "Frogger");
    expect(frogger?.gridY).toBe(13);
  });

  it("applies fast_traffic mutators correctly", async () => {
    const mutatorGame = new FroggerGame({
      gameOptions: {
        rawConfig: { TRAFFIC_SPEED_MULTIPLIER: 2.0 },
      },
    });
    await mutatorGame.init();
    mutatorGame.start();

    const world = mutatorGame.getWorld();
    const config = world.getResource<any>("GameConfig");
    expect(config.TRAFFIC_SPEED_MULTIPLIER).toBe(2.0);

    mutatorGame.stop();
  });

  it("triggers game over when all lives are depleted", () => {
    const world = game.getWorld();
    const stateEntity = world.query("FroggerState")[0];

    world.mutateComponent(stateEntity, "FroggerState", (s) => {
      s.lives = 1;
    });

    const froggerEntity = world.query("Frogger")[0];
    world.mutateComponent(froggerEntity, "Frogger", (f) => {
      f.isAlive = false;
    });

    game.update(0.6);

    const state = game.getGameState();
    expect(state.isGameOver).toBe(true);
    expect(game.isGameOver()).toBe(true);
  });
});
