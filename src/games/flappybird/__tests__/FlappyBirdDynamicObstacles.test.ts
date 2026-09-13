import { FlappyBirdGame } from "../FlappyBirdGame";

describe("Flappy Bird Dynamic Obstacles, Energy Meter & Sector Events Integration", () => {
  let game: FlappyBirdGame;

  beforeEach(async () => {
    game = new FlappyBirdGame({ gameOptions: { seed: 12345 } });
    await game.init();
  });

  afterEach(() => {
    game.destroy();
  });

  test("should spawn dynamic pipe variants in deterministic rotation", () => {
    const world = game.getWorld();
    const bird = world.query("Bird")[0];

    // Keep bird afloat and alive so game over doesn't pause spawner
    for (let i = 0; i < 600; i++) {
      if (bird) {
        world.mutateComponent(bird, "Transform", (t) => { t.y = 300; });
        world.mutateComponent(bird, "Velocity", (v) => { v.vy = 0; });
      }
      game.update(1 / 60);
    }

    const pipes = world.query("Pipe");
    expect(pipes.length).toBeGreaterThan(0);

    const movementTypes = new Set<string>();
    pipes.forEach((entity) => {
      const pipe = world.getComponent(entity, "Pipe");
      if (pipe?.movementType) {
        movementTypes.add(pipe.movementType);
      }
    });

    expect(movementTypes.size).toBeGreaterThan(0);
  });

  test("should oscillate pipe gaps during FlappyBirdPipeMovementSystem update", () => {
    const world = game.getWorld();

    // Manually create a pipe for isolated testing with explicit visualVariant
    const { createPipe } = require("../EntityFactory");
    createPipe({
      world,
      x: 300,
      gapY: 200,
      visualVariant: "standard",
      movementType: "oscillating",
      oscillationAmplitude: 50,
      oscillationSpeed: 4.0
    });

    const pipeEntity = world.query("Pipe")[0];
    expect(pipeEntity).toBeDefined();

    const initialGapY = world.getComponent(pipeEntity, "Pipe")!.gapY;
    for (let i = 0; i < 15; i++) {
      game.update(1 / 60);
    }

    const updatedGapY = world.getComponent(pipeEntity, "Pipe")!.gapY;
    expect(updatedGapY).not.toEqual(initialGapY);
  });

  test("should drain and overheat glide energy when gliding continuously", () => {
    const world = game.getWorld();
    const birdEntity = world.query("Bird")[0];
    expect(birdEntity).toBeDefined();

    const initialEnergy = world.getComponent(birdEntity, "GlideEnergy")!.currentEnergy;

    // Simulate press duration > 0.2s to trigger glide input
    world.mutateComponent(birdEntity, "FlappyInput", (inp) => {
      inp.glide = true;
      inp.pressDuration = 0.25;
      inp.isPressed = true;
    });

    for (let i = 0; i < 180; i++) { // 3 seconds of gliding
      world.mutateComponent(birdEntity, "Transform", (t) => { t.y = 200; });
      world.mutateComponent(birdEntity, "Velocity", (v) => { v.vy = 100; });
      world.mutateComponent(birdEntity, "FlappyInput", (inp) => {
        inp.glide = true;
        inp.pressDuration = 0.25 + i * 0.016;
        inp.isPressed = true;
      });
      game.update(1 / 60);
    }

    const energy = world.getComponent(birdEntity, "GlideEnergy")!;
    expect(energy.currentEnergy).toBeLessThan(initialEnergy);
    expect(energy.isOverheated).toBe(true);
    expect(energy.overheatCooldownTicks).toBeGreaterThan(0);
  });

  test("should cycle sector environmental events deterministically", () => {
    const world = game.getWorld();

    // Direct state simulation check without heavy loops
    world.mutateSingleton("FlappyState", (gs) => {
      gs.sectorEventTicks = 599;
    });

    game.update(1 / 60);

    const state = world.getSingleton("FlappyState");
    expect(state).toBeDefined();
    expect(state?.currentSectorEvent).not.toBe("none");
    expect(state?.pipeSpeedMultiplier).not.toBe(1.0);
  });

  test("should produce identical simulation state snapshots with same seed", async () => {
    const game1 = new FlappyBirdGame({ gameOptions: { seed: 9999 } });
    const game2 = new FlappyBirdGame({ gameOptions: { seed: 9999 } });
    await game1.init();
    await game2.init();

    for (let i = 0; i < 60; i++) {
      game1.update(1 / 60);
      game2.update(1 / 60);
    }

    const state1 = game1.getGameState();
    const state2 = game2.getGameState();

    expect(state1.score).toBe(state2.score);
    expect(state1.pipesSpawnedCount).toBe(state2.pipesSpawnedCount);
    expect(state1.currentSectorEvent).toBe(state2.currentSectorEvent);
    expect(state1.pipeSpeedMultiplier).toBe(state2.pipeSpeedMultiplier);

    game1.destroy();
    game2.destroy();
  });
});
