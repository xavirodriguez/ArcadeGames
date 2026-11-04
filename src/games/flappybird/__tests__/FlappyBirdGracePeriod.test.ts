import { TouchInputState } from "@tiny-aster/core";
import { FlappyBirdGame } from "../FlappyBirdGame";
import { FLAPPY_CONFIG, createFlappyState } from "../types/FlappyBirdTypes";

describe("FlappyBird grace period", () => {
  let game: FlappyBirdGame;
  let world: ReturnType<FlappyBirdGame["getWorld"]>;

  beforeEach(async () => {
    game = new FlappyBirdGame({ gameOptions: { seed: 42 } });
    await game.init();
    world = game.getWorld();
  });

  afterEach(() => {
    game.destroy();
  });

  it("starts with graceTimeRemaining equal to GRACE_PERIOD_SECONDS", () => {
    const state = world.getSingleton("FlappyState");
    expect(state).toBeDefined();
    expect(state!.graceTimeRemaining).toBe(FLAPPY_CONFIG.GRACE_PERIOD_SECONDS);
  });

  it("createFlappyState defaults graceTimeRemaining from config", () => {
    const state = createFlappyState();
    expect(state.graceTimeRemaining).toBe(FLAPPY_CONFIG.GRACE_PERIOD_SECONDS);
  });

  it("(a) with grace active and no flap, bird does not fall past GRACE_MAX_FALL_Y", () => {
    const birdEntity = world.query("Bird")[0];
    expect(birdEntity).toBeDefined();

    const startY = world.getComponent(birdEntity, "Transform")!.y;
    expect(startY).toBeLessThanOrEqual(FLAPPY_CONFIG.GRACE_MAX_FALL_Y);

    // Simulate ~2.5 seconds without flapping (still inside 3s grace)
    for (let i = 0; i < 150; i++) {
      world.update(1 / 60);
    }

    const state = world.getSingleton("FlappyState")!;
    expect(state.graceTimeRemaining).toBeGreaterThan(0);

    const transform = world.getComponent(birdEntity, "Transform")!;
    expect(transform.y).toBeLessThanOrEqual(FLAPPY_CONFIG.GRACE_MAX_FALL_Y + 0.01);

    const bird = world.getComponent(birdEntity, "Bird")!;
    if (transform.y >= FLAPPY_CONFIG.GRACE_MAX_FALL_Y - 0.01) {
      expect(Math.abs(bird.velocityY)).toBeLessThan(1);
    }
  });

  it("(b) a flap sets graceTimeRemaining to 0 and gravity acts without the Y clamp", () => {
    const birdEntity = world.query("Bird")[0];
    const touchState = new TouchInputState();
    world.setResource("TouchInputState", touchState);

    for (let i = 0; i < 30; i++) {
      world.update(1 / 60);
    }
    expect(world.getSingleton("FlappyState")!.graceTimeRemaining).toBeGreaterThan(0);

    touchState.setButton("flap", true);
    world.update(1 / 60);
    touchState.setButton("flap", false);

    expect(world.getSingleton("FlappyState")!.graceTimeRemaining).toBe(0);

    for (let i = 0; i < 120; i++) {
      world.update(1 / 60);
    }
    const y = world.getComponent(birdEntity, "Transform")!.y;
    const state = world.getSingleton("FlappyState")!;
    if (!state.isGameOver) {
      expect(y).toBeGreaterThan(FLAPPY_CONFIG.GRACE_MAX_FALL_Y);
    }
  });

  it("(c) after 3s without flap the bird falls normally past GRACE_MAX_FALL_Y", () => {
    const birdEntity = world.query("Bird")[0];

    for (let i = 0; i < 200; i++) {
      world.update(1 / 60);
    }

    const state = world.getSingleton("FlappyState")!;
    expect(state.graceTimeRemaining).toBe(0);

    for (let i = 0; i < 90; i++) {
      world.update(1 / 60);
    }

    const transform = world.getComponent(birdEntity, "Transform")!;
    const stateAfter = world.getSingleton("FlappyState")!;
    if (!stateAfter.isGameOver) {
      expect(transform.y).toBeGreaterThan(FLAPPY_CONFIG.GRACE_MAX_FALL_Y);
    }
  });

  it("(d) pipes are not spawned during the grace period", () => {
    const pipesBefore = world.query("Pipe").length;

    for (let i = 0; i < 120; i++) {
      world.update(1 / 60);
    }

    const state = world.getSingleton("FlappyState")!;
    expect(state.graceTimeRemaining).toBeGreaterThan(0);
    expect(state.pipeSpawnTimer).toBe(0);
    expect(world.query("Pipe").length).toBe(pipesBefore);
  });

  it("(e) after restart the grace timer is restored to GRACE_PERIOD_SECONDS", async () => {
    for (let i = 0; i < 200; i++) {
      world.update(1 / 60);
    }
    expect(world.getSingleton("FlappyState")!.graceTimeRemaining).toBe(0);

    await game.restart();
    world = game.getWorld();

    const state = world.getSingleton("FlappyState")!;
    expect(state.graceTimeRemaining).toBe(FLAPPY_CONFIG.GRACE_PERIOD_SECONDS);
  });
});
