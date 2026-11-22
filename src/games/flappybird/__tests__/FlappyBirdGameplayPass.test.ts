import { FlappyBirdGame } from "../FlappyBirdGame";
import { createPipe } from "../EntityFactory";
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
