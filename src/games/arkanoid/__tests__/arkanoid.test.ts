import { ArkanoidGame } from "../ArkanoidGame";
import { DEFAULT_ARKANOID_CONFIG } from "../types/ArkanoidConfigSchema";

describe("Arkanoid Game & Systems Test Suite", () => {
  let game: ArkanoidGame;

  afterEach(() => {
    if (game) {
      game.destroy();
    }
  });

  it("should initialize ArkanoidGame and spawn core entities", async () => {
    game = new ArkanoidGame({ seed: 42, headless: true });
    await game.init();

    const world = game.world;
    const paddle = world.query("Paddle");
    const ball = world.query("Ball");
    const bricks = world.query("Brick");
    const state = world.getSingleton("ArkanoidState");

    expect(paddle.length).toBe(1);
    expect(ball.length).toBe(1);
    expect(bricks.length).toBeGreaterThan(0);
    expect(state).toBeDefined();
    expect(state?.lives).toBe(DEFAULT_ARKANOID_CONFIG.PLAYER_INITIAL_LIVES);
    expect(state?.score).toBe(0);
  });

  it("should execute 3-layer collision pipeline: hit and death processing", async () => {
    game = new ArkanoidGame({ seed: 100, headless: true });
    await game.init();
    const world = game.world;

    const bricks = world.query("Brick", "Health");
    expect(bricks.length).toBeGreaterThan(0);

    const brickEntity = bricks[0];

    const eventBus = world.getEventBus();
    expect(eventBus).toBeDefined();

    eventBus.emitDeferred("combat:death", { entity: brickEntity });
    game.update(0.016);

    const state = game.getGameState();
    expect(state.score).toBeGreaterThan(0);
  });

  it("should handle ball launch when p1Launch input is triggered", async () => {
    game = new ArkanoidGame({ seed: 123, headless: true });
    await game.init();
    const world = game.world;

    const ballEntities = world.query("Ball", "Velocity");
    const ballEntity = ballEntities[0];
    let ball = world.getComponent(ballEntity, "Ball")!;
    expect(ball.isAttached).toBe(true);

    game.setInputState({ p1Launch: true });

    game.update(0.016);

    const launchedBall = world.getComponent(ballEntity, "Ball")!;
    const vel = world.getComponent(ballEntity, "Velocity")!;
    expect(launchedBall.isAttached).toBe(false);
    expect(vel.vy).toBeLessThan(0); // Upward velocity
  });

  it("should decrement lives when ball falls below bottom plane", async () => {
    game = new ArkanoidGame({ seed: 777, headless: true });
    await game.init();
    const world = game.world;

    const ballEntities = world.query("Ball", "Transform");
    const ballEntity = ballEntities[0];

    world.mutateComponent(ballEntity, "Ball", (b) => {
      b.isAttached = false;
    });
    world.mutateComponent(ballEntity, "Transform", (t) => {
      t.y = DEFAULT_ARKANOID_CONFIG.SCREEN_HEIGHT + 100;
      t.dirty = true;
    });

    game.update(0.016);

    const state = game.getGameState();
    expect(state.lives).toBe(DEFAULT_ARKANOID_CONFIG.PLAYER_INITIAL_LIVES - 1);
  });
});
