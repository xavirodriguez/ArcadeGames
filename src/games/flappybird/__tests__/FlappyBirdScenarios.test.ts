import { FlappyBirdConfigSchema } from "../types/FlappyBirdConfigSchema";
import { selectScenario } from "../systems/FlappyBirdGameStateSystem";
import { createPipe } from "../EntityFactory";
import { FlappyBirdGame } from "../FlappyBirdGame";
import { getScenarioConfig } from "../ScenarioDefinitions";

describe("FlappyBird Scenario System", () => {
  describe("selectScenario pure function", () => {
    it("should rotate scenarios deterministically every N pipes", () => {
      const pipesPerScenario = 5;
      const config = { PIPES_PER_SCENARIO: pipesPerScenario, SCENARIO_ROTATION_ENABLED: true };

      expect(selectScenario(0, config)).toBe("open_space");
      expect(selectScenario(4, config)).toBe("open_space");
      expect(selectScenario(5, config)).toBe("asteroid_belt");
      expect(selectScenario(9, config)).toBe("asteroid_belt");
      expect(selectScenario(10, config)).toBe("solar_storm");
      expect(selectScenario(15, config)).toBe("warp_corridor");
      expect(selectScenario(20, config)).toBe("open_space");
    });

    it("should respect custom PIPES_PER_SCENARIO", () => {
      const config = { PIPES_PER_SCENARIO: 10, SCENARIO_ROTATION_ENABLED: true };

      expect(selectScenario(0, config)).toBe("open_space");
      expect(selectScenario(9, config)).toBe("open_space");
      expect(selectScenario(10, config)).toBe("asteroid_belt");
      expect(selectScenario(19, config)).toBe("asteroid_belt");
      expect(selectScenario(20, config)).toBe("solar_storm");
    });

    it("should remain in open_space when rotation is disabled", () => {
      const config = { SCENARIO_ROTATION_ENABLED: false, PIPES_PER_SCENARIO: 5 };

      expect(selectScenario(0, config)).toBe("open_space");
      expect(selectScenario(10, config)).toBe("open_space");
      expect(selectScenario(50, config)).toBe("open_space");
    });
  });

  describe("Config overrides application and reversion", () => {
    let game: FlappyBirdGame;

    beforeEach(async () => {
      game = new FlappyBirdGame({
        gameOptions: {
          PIPES_PER_SCENARIO: 5,
          SCENARIO_ROTATION_ENABLED: true,
        },
      });
      await game.init();
    });

    afterEach(() => {
      game.destroy();
    });

    it("should apply overrides on scenario transition and revert clean on loop back", () => {
      const world = game.getWorld();

      let state = world.getSingleton("FlappyState")!;
      expect(state.currentScenario).toBe("open_space");

      // Advance spawn count to trigger asteroid belt transition
      world.mutateSingleton("FlappyState", (gs) => {
        gs.pipesSpawnedCount = 5;
      });

      game.update(0.016);

      state = world.getSingleton("FlappyState")!;
      expect(state.currentScenario).toBe("asteroid_belt");
      expect(state.previousScenario).toBe("open_space");
      expect(state.scenarioTransitionTicks).toBeGreaterThan(0);

      const asteroidOverrides = getScenarioConfig("asteroid_belt").configOverrides;
      expect(asteroidOverrides?.GAP_SIZE).toBe(125);

      // Advance spawn count to cycle back to open space (20 pipes)
      world.mutateSingleton("FlappyState", (gs) => {
        gs.pipesSpawnedCount = 20;
      });

      game.update(0.016);

      state = world.getSingleton("FlappyState")!;
      expect(state.currentScenario).toBe("open_space");
      expect(state.previousScenario).toBe("asteroid_belt");

      const openSpaceOverrides = getScenarioConfig("open_space").configOverrides;
      expect(openSpaceOverrides?.GAP_SIZE).toBe(140);
    });
  });

  describe("createPipe recipe sampling", () => {
    let game: FlappyBirdGame;

    beforeEach(async () => {
      game = new FlappyBirdGame();
      await game.init();
    });

    afterEach(() => {
      game.destroy();
    });

    it("should generate only variants specified by active scenario recipe", () => {
      const world = game.getWorld();

      // Set scenario to asteroid_belt whose recipe only contains 'damaged' and 'rusted' variants
      world.mutateSingleton("FlappyState", (gs) => {
        gs.currentScenario = "asteroid_belt";
      });

      world.gameplayRandom.unlock();

      for (let i = 0; i < 20; i++) {
        createPipe({
          world,
          x: 200 + i * 50,
          gapY: 300,
        });
      }

      world.gameplayRandom.lock();

      const pipeEntities = world.query("Pipe");
      expect(pipeEntities.length).toBeGreaterThan(0);

      const variants = new Set<string>();
      pipeEntities.forEach((entity) => {
        const pipe = world.getComponent(entity, "Pipe");
        if (pipe?.visualVariant) {
          variants.add(pipe.visualVariant);
        }
      });

      expect(variants.has("standard")).toBe(false);
      expect(variants.has("damaged") || variants.has("rusted")).toBe(true);
    });
  });

  describe("FlappyBirdConfigSchema validation", () => {
    it("should parse default scenario fields", () => {
      const parsed = FlappyBirdConfigSchema.parse({});
      expect(parsed.SCENARIO_ROTATION_ENABLED).toBe(true);
      expect(parsed.PIPES_PER_SCENARIO).toBe(5);
    });

    it("should accept custom scenario configuration overrides", () => {
      const parsed = FlappyBirdConfigSchema.parse({
        SCENARIO_ROTATION_ENABLED: false,
        PIPES_PER_SCENARIO: 12,
      });
      expect(parsed.SCENARIO_ROTATION_ENABLED).toBe(false);
      expect(parsed.PIPES_PER_SCENARIO).toBe(12);
    });
  });
});
