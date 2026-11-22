import { FlappyBirdGame } from "../FlappyBirdGame";
import { createPipe } from "../EntityFactory";
import { FlappyBirdCollisionSystem } from "../systems/FlappyBirdCollisionSystem";
import { FlappyBirdConfigSchema } from "../types/FlappyBirdConfigSchema";
import { resolveGapSize } from "../systems/FlappyBirdDifficulty";
import { FlappyBirdGameStateSystem } from "../systems/FlappyBirdGameStateSystem";
import { DEFAULT_FLAPPY_BIRD_CONFIG } from "../types/FlappyBirdConfigSchema";
import { officePaperTheme } from "../../../theme/officePaperTheme";

describe("Flappy Bird gameplay pass — sector score multiplier", () => {
  let game: FlappyBirdGame;
  let world: ReturnType<FlappyBirdGame["getWorld"]>;

  beforeEach(async () => {
    game = new FlappyBirdGame();
    await game.init();
    world = game.getWorld();
  });

  afterEach(() => {
    game.destroy();
  });

  function comboEntity(): number {
    const entities = world.query("Combo");
    expect(entities).toHaveLength(1);
    return entities[0];
  }

  function stateSystem(): FlappyBirdGameStateSystem {
    const system = new FlappyBirdGameStateSystem(game, DEFAULT_FLAPPY_BIRD_CONFIG);
    system.onRegister(world);
    return system;
  }

  it("applies Hyper Warp's ×2 score factor when a pipe advances the combo", () => {
    const combo = comboEntity();
    world.mutateComponent(combo, "Combo", (component) => {
      component.combo = 4;
      component.multiplier = 1;
      component.timerRemaining = 0;
    });
    world.mutateSingleton("FlappyState", (state) => {
      state.graceTimeRemaining = 0;
      state.currentSectorEvent = "hyper_warp";
      state.sectorEventDuration = 20;
      state.sectorEventTicks = 0;
    });
    createPipe({
      world,
      x: 50,
      gapY: 300,
      visualVariant: "standard",
      movementType: "static",
      isNarrowGap: false
    });

    stateSystem().update(world, 1 / 60);

    expect(world.getSingleton("FlappyState")?.score).toBe(4);
    expect(world.getSingleton("FlappyState")?.sectorScoreMultiplier).toBe(2);
    expect(world.getComponent(combo, "Combo")?.combo).toBe(5);
    expect(world.getComponent(combo, "Combo")?.multiplier).toBe(2);
    expect(game.getGameState().multiplier).toBe(4);
  });

  it("restores the effective HUD multiplier to the combo value when Hyper Warp ends", () => {
    const combo = comboEntity();
    world.mutateComponent(combo, "Combo", (component) => {
      component.combo = 14;
      component.multiplier = 3;
      component.timerRemaining = 1;
    });
    world.mutateSingleton("FlappyState", (state) => {
      state.currentSectorEvent = "hyper_warp";
      state.sectorEventDuration = 1;
      state.sectorEventTicks = 0;
      state.sectorScoreMultiplier = 2;
    });

    stateSystem().update(world, 1 / 60);

    expect(world.getSingleton("FlappyState")?.currentSectorEvent).toBe("none");
    expect(world.getSingleton("FlappyState")?.sectorScoreMultiplier).toBe(1);
    expect(world.getComponent(combo, "Combo")?.multiplier).toBe(3);
    expect(game.getGameState().multiplier).toBe(3);
  });
});

describe("Flappy Bird gameplay pass — announcement presentation", () => {
  let game: FlappyBirdGame;

  afterEach(() => {
    game?.destroy();
  });

  function announcements(target: FlappyBirdGame) {
    const world = target.getWorld();
    return world.query("Render", "Transform", "TTL").flatMap((entity) => {
      const render = world.getComponent(entity, "Render");
      const transform = world.getComponent(entity, "Transform");
      if (render?.shape !== "floating_text" || !render.text || !transform) return [];
      return [{ text: render.text, x: transform.x, y: transform.y }];
    });
  }

  it("announces both events with separated positions", async () => {
    game = new FlappyBirdGame();
    await game.init();
    expect(announcements(game)).toHaveLength(0);

    const bus = game.getEventBus();
    bus.emit("flappy:scenario_changed", { from: "open_space", to: "asteroid_belt" });
    bus.emit("flappy:sector_event_started", { event: "asteroid_storm" });

    const rendered = announcements(game);
    expect(rendered.map((item) => item.text)).toEqual(["ASTEROID BELT", "ASTEROID STORM"]);
    expect(Math.abs(rendered[0].y - rendered[1].y)).toBeGreaterThan(20);
  });

  it("uses office-paper wording instead of spatial wording", async () => {
    game = new FlappyBirdGame({ theme: officePaperTheme });
    await game.init();

    game.getEventBus().emit("flappy:scenario_changed", {
      from: "open_space",
      to: "asteroid_belt"
    });

    expect(announcements(game).map((item) => item.text)).toEqual(["ARCHIVE AISLE"]);
  });

  it("does not announce on initialisation or when resetting a run", async () => {
    game = new FlappyBirdGame();
    await game.init();
    const world = game.getWorld();

    expect(announcements(game)).toHaveLength(0);
    world.mutateSingleton("FlappyState", (state) => {
      state.currentScenario = "warp_corridor";
      state.pipesSpawnedCount = 20;
      state.currentSectorEvent = "hyper_warp";
      state.sectorEventDuration = 100;
    });
    const stateSystem = new FlappyBirdGameStateSystem(game, DEFAULT_FLAPPY_BIRD_CONFIG);
    stateSystem.resetGameOverState(world);
    game.update(1 / 60);

    expect(world.getSingleton("FlappyState")?.currentScenario).toBe("open_space");
    expect(world.getSingleton("FlappyState")?.currentSectorEvent).toBe("none");
    expect(announcements(game)).toHaveLength(0);
  });
});

describe("Flappy Bird gameplay pass — near-miss glide recharge", () => {
  let game: FlappyBirdGame;
  let world: ReturnType<FlappyBirdGame["getWorld"]>;
  let bird: number;
  let collisionSystem: FlappyBirdCollisionSystem;

  beforeEach(async () => {
    game = new FlappyBirdGame();
    await game.init();
    world = game.getWorld();
    bird = world.query("Bird")[0];
    collisionSystem = new FlappyBirdCollisionSystem(game);
    world.mutateComponent(bird, "Transform", (transform) => {
      transform.x = 80;
      transform.y = 220;
      transform.worldX = 80;
      transform.worldY = 220;
    });
    createPipe({
      world,
      x: 130,
      gapY: 300,
      visualVariant: "standard",
      movementType: "static",
      isNarrowGap: false
    });
  });

  afterEach(() => {
    game.destroy();
  });

  function setEnergy(currentEnergy: number, isOverheated = false): void {
    world.mutateComponent(bird, "GlideEnergy", (energy) => {
      energy.currentEnergy = currentEnergy;
      energy.isOverheated = isOverheated;
    });
  }

  function runNearMiss(): void {
    collisionSystem.update(world, 1 / 60);
  }

  it("adds NEAR_MISS_GLIDE_ENERGY in proportion to geometric closeness", () => {
    setEnergy(10);

    runNearMiss();

    expect(world.getComponent(bird, "GlideEnergy")?.currentEnergy).toBeCloseTo(
      10 + 25 * (1 - 5 / 12)
    );
    expect(world.getComponent(bird, "Bird")?.nearMissTimer).toBeCloseTo(0.3);
  });

  it("caps the recharge at maxEnergy", () => {
    setEnergy(98);

    runNearMiss();

    expect(world.getComponent(bird, "GlideEnergy")?.currentEnergy).toBe(100);
  });

  it("does not recharge an overheated glide component", () => {
    setEnergy(35, true);

    runNearMiss();

    expect(world.getComponent(bird, "GlideEnergy")?.currentEnergy).toBe(35);
    expect(world.getComponent(bird, "GlideEnergy")?.isOverheated).toBe(true);
  });

  it("does not recharge again while the 0.3-second near-miss timer is active", () => {
    setEnergy(10);
    runNearMiss();
    const afterFirstNearMiss = world.getComponent(bird, "GlideEnergy")?.currentEnergy;

    runNearMiss();

    expect(world.getComponent(bird, "GlideEnergy")?.currentEnergy).toBe(afterFirstNearMiss);
  });

  it("detects a near-miss at the pipe face before horizontal collision", () => {
    setEnergy(10);

    // Pipe's left edge is x=100; bird's right edge is x=95.
    // The bird is vertically outside the gap and has a five-pixel AABB separation.
    runNearMiss();

    expect(world.getComponent(bird, "Bird")?.nearMissTimer).toBeCloseTo(0.3);
    expect(world.getComponent(bird, "CollisionEvents")?.collisions).toHaveLength(0);
    expect(world.getSingleton("FlappyState")?.score).toBeGreaterThan(0);
  });

  it("defaults NEAR_MISS_GLIDE_ENERGY to 25", () => {
    expect(FlappyBirdConfigSchema.parse({}).NEAR_MISS_GLIDE_ENERGY).toBe(25);
  });
});

describe("Flappy Bird gameplay pass — scenario gap sizes", () => {
  let game: FlappyBirdGame;
  let world: ReturnType<FlappyBirdGame["getWorld"]>;

  beforeEach(async () => {
    game = new FlappyBirdGame();
    await game.init();
    world = game.getWorld();
    world.mutateSingleton("FlappyState", (state) => {
      state.currentScenario = "asteroid_belt";
    });
  });

  afterEach(() => {
    game.destroy();
  });

  function topPipeGapAt(x: number): number | undefined {
    const entity = world.query("Pipe", "Transform").find((candidate) => {
      const pipe = world.getComponent(candidate, "Pipe");
      const transform = world.getComponent(candidate, "Transform");
      return pipe?.isTopPipe === true && transform?.x === x;
    });
    return entity === undefined ? undefined : world.getComponent(entity, "Pipe")?.gapSize;
  }

  it("uses GAP_SIZE from the active scenario and applies narrow-gap scaling afterward", () => {
    createPipe({
      world,
      x: 150,
      gapY: 300,
      visualVariant: "standard",
      movementType: "static",
      isNarrowGap: false
    });
    createPipe({
      world,
      x: 350,
      gapY: 300,
      visualVariant: "standard",
      movementType: "static",
      isNarrowGap: true
    });

    expect(topPipeGapAt(150)).toBe(125);
    expect(topPipeGapAt(350)).toBeCloseTo(125 * 0.7);
  });

  it("falls back to the base GAP_SIZE when the active scenario has no override", () => {
    expect(resolveGapSize({
      baseGapSize: 140,
      scenarioGapSizeOverride: undefined,
      isNarrowGap: false
    })).toBe(140);
  });

  it("uses a scenario override before applying narrow-gap scaling", () => {
    expect(resolveGapSize({
      baseGapSize: 140,
      scenarioGapSizeOverride: 120,
      isNarrowGap: true
    })).toBeCloseTo(84);
  });
});
