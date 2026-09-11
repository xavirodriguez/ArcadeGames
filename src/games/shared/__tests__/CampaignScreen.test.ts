import React from "react";
import { CampaignScreen } from "../../../components/CampaignScreen";
import { GameDefinitionRegistry, CampaignGameResolver, BaseGame } from "@tiny-aster/core";
import { registerDefaultCampaignGames } from "../../../services/CampaignGameRegistryService";
import { proofOfConceptStoryGraph } from "../story/ProofOfConceptStoryGraph";

describe("CampaignScreen Component & Resolver Tests", () => {
  beforeAll(() => {
    registerDefaultCampaignGames();
  });

  it("resolves registered GameDefinition for all registered minigames", () => {
    const gameIds = [
      "asteroids",
      "echorunner",
      "space-invaders",
      "flappybird",
      "pong",
      "geometrywars",
      "platformer",
      "frogger"
    ];

    for (const id of gameIds) {
      expect(GameDefinitionRegistry.has(id)).toBe(true);
      const def = GameDefinitionRegistry.resolve(id);
      expect(def).toBeDefined();
      expect(def.name).toBe(id);

      const sim = def.createSimulation(12345);
      expect(sim).toBeDefined();
    }
  });

  it("normalizes legacy gameId strings in GameDefinitionRegistry", () => {
    expect(GameDefinitionRegistry.resolve("space_invaders").name).toBe("space-invaders");
    expect(GameDefinitionRegistry.resolve("spaceinvaders").name).toBe("space-invaders");
    expect(GameDefinitionRegistry.resolve("echo-runner").name).toBe("echorunner");
    expect(GameDefinitionRegistry.resolve("flappy-bird").name).toBe("flappybird");
    expect(GameDefinitionRegistry.resolve("geometry-wars").name).toBe("geometrywars");
  });

  it("throws on unknown gameId in GameDefinitionRegistry", () => {
    expect(() => GameDefinitionRegistry.resolve("non_existent_game")).toThrow(
      /Unknown gameId/
    );
  });

  it("creates CampaignScreen React element with default props", () => {
    const element = React.createElement(CampaignScreen, {
      slotId: "test_slot",
      defaultGameId: "echorunner"
    });

    expect(element).toBeTruthy();
    expect(element.type).toBe(CampaignScreen);
  });

  it("verifies proofOfConceptStoryGraph nodes resolve to valid game definitions", () => {
    for (const [nodeId, node] of Object.entries(proofOfConceptStoryGraph.nodes)) {
      const targetGameId = (node.sceneToLoad || node.meta?.minijuego || node.meta?.sceneToLoad) as string | undefined;

      if (node.type === "gameplay") {
        expect(targetGameId).toBeDefined();
        const normalizedId = GameDefinitionRegistry.normalizeId(targetGameId!);
        const isRegistered = GameDefinitionRegistry.has(normalizedId);
        expect(isRegistered).toBe(true);

        expect(() => GameDefinitionRegistry.resolve(normalizedId)).not.toThrow();
      } else if (node.sceneToLoad) {
        const normalizedId = GameDefinitionRegistry.normalizeId(node.sceneToLoad);
        const isRegistered = GameDefinitionRegistry.has(normalizedId);
        expect(isRegistered).toBe(true);
      }
    }
  });

  it("verifies MidGameNarrativeDirector updates performance variables on StoryRuntime upon game:over", () => {
    const { StoryRuntime, EventBus, MidGameNarrativeDirector } = require("@tiny-aster/core");
    const runtime = new StoryRuntime(proofOfConceptStoryGraph);
    const bus = new EventBus();
    const director = new MidGameNarrativeDirector();
    director.bindEventBus(bus, runtime);

    bus.emit("game:over", {
      runId: "run_test_1",
      gameId: "asteroids",
      score: 2500,
      completed: true,
      durationMs: 12000,
      metrics: {},
      secretsFound: []
    });

    const vars = runtime.getState().variables;
    expect(vars.lastMinigameScore).toBe(2500);
    expect(vars.lastMinigameCompleted).toBe(true);
    expect(vars.playerPerformance).toBe("perfect");
  });

  it("calculates dynamic durationMs on BaseGame.getMiniGameResult based on session start time", async () => {
    const def = GameDefinitionRegistry.resolve("asteroids");
    const game = def.createSimulation(12345) as BaseGame;
    await game.init();

    // Allow time to elapse
    await new Promise((resolve) => setTimeout(resolve, 10));

    const result = game.getMiniGameResult({ gameId: "asteroids" });
    expect(result.durationMs).toBeGreaterThan(0);
    expect(result.durationMs).not.toBe(30000);

    game.destroy();
  });

  it("generates deterministic session seeds based on campaign slotId using RandomService", () => {
    const { RandomService } = require("@tiny-aster/core");

    const deriveSeedFromSlot = (slotId: string): number => {
      let seedValue = 0;
      for (let i = 0; i < slotId.length; i++) {
        seedValue = (seedValue << 5) - seedValue + slotId.charCodeAt(i);
        seedValue |= 0;
      }
      return Math.abs(seedValue) || 123456789;
    };

    const slotId = "slot_alpha";
    const seed = deriveSeedFromSlot(slotId);
    const prng = new RandomService(seed);

    const firstSeed = prng.nextInt(1, 0x7FFFFFFF);
    const secondSeed = prng.nextInt(1, 0x7FFFFFFF);

    // Re-instantiating with the same seed reproduces exact sequence
    const prngReproduced = new RandomService(seed);
    expect(prngReproduced.nextInt(1, 0x7FFFFFFF)).toBe(firstSeed);
    expect(prngReproduced.nextInt(1, 0x7FFFFFFF)).toBe(secondSeed);
  });
});
