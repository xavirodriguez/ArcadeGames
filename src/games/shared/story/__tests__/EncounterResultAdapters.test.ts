import { MiniGameRunContext, MiniGameResult } from "@tiny-aster/core";
import { FlappyBirdArcadeAdapter } from "../../../flappybird/story/FlappyBirdEncounter";
import { PlatformerArcadeAdapter } from "../../../platformer/story/PlatformerEncounter";
import { AsteroidsArcadeAdapter } from "../../../asteroids/story/EscapeRouteEncounter";
import { SpaceInvadersArcadeAdapter } from "../../../space-invaders/story/InvasionEncounter";
import { GeometryWarsArcadeAdapter } from "../../../geometrywars/story/GeometryWarsEncounter";

describe("Encounter Result Adapters Characterization Tests", () => {
  const dummyContext: MiniGameRunContext = {
    runId: "run_test_01",
    encounterId: "encounter_test_01",
    gameId: "test_game",
    seed: 12345,
    config: { targetScore: 1000 },
    modifiers: []
  };

  class TestFlappyAdapter extends FlappyBirdArcadeAdapter {
    public buildTestResult(context: MiniGameRunContext, payload?: Record<string, unknown>): MiniGameResult {
      return this.buildResult(context, payload);
    }
  }

  class TestPlatformerAdapter extends PlatformerArcadeAdapter {
    public buildTestResult(context: MiniGameRunContext, payload?: Record<string, unknown>): MiniGameResult {
      return this.buildResult(context, payload);
    }
  }

  class TestAsteroidsAdapter extends AsteroidsArcadeAdapter {
    public buildTestResult(context: MiniGameRunContext, payload?: Record<string, unknown>): MiniGameResult {
      return this.buildResult(context, payload);
    }
  }

  class TestSpaceInvadersAdapter extends SpaceInvadersArcadeAdapter {
    public buildTestPayload(context: MiniGameRunContext, payload?: Record<string, unknown>) {
      return this.buildResultPayload(context, payload);
    }
  }

  class TestGeometryWarsAdapter extends GeometryWarsArcadeAdapter {
    public buildTestPayload(context: MiniGameRunContext, payload?: Record<string, unknown>) {
      return this.buildResultPayload(context, payload);
    }
  }

  it("FlappyBirdArcadeAdapter builds exact result structure with and without score payload", () => {
    const adapter = new TestFlappyAdapter();

    const resultWithPayload = adapter.buildTestResult(dummyContext, {
      score: 15,
      completed: true,
      durationMs: 22000,
      pipesCleared: 15,
      nearMisses: 3,
      foundFeather: true
    });

    expect(resultWithPayload).toEqual({
      runId: "run_test_01",
      gameId: "test_game",
      score: 15,
      completed: true,
      durationMs: 22000,
      metrics: {
        pipesCleared: 15,
        nearMisses: 3
      },
      secretsFound: ["golden_feather_artifact"]
    });

    const resultWithoutPayload = adapter.buildTestResult(dummyContext, {});
    expect(resultWithoutPayload).toEqual({
      runId: "run_test_01",
      gameId: "test_game",
      score: 0,
      completed: false,
      durationMs: 20000,
      metrics: {
        pipesCleared: 0,
        nearMisses: 0
      },
      secretsFound: []
    });
  });

  it("PlatformerArcadeAdapter builds exact result structure with and without score payload", () => {
    const adapter = new TestPlatformerAdapter();

    const resultWithPayload = adapter.buildTestResult(dummyContext, {
      score: 1200,
      completed: true,
      durationMs: 45000,
      coinsCollected: 25,
      enemiesDefeated: 5,
      foundRelicCache: true
    });

    expect(resultWithPayload).toEqual({
      runId: "run_test_01",
      gameId: "test_game",
      score: 1200,
      completed: true,
      durationMs: 45000,
      metrics: {
        coinsCollected: 25,
        enemiesDefeated: 5
      },
      secretsFound: ["ancient_relic_cache"]
    });

    const resultWithoutPayload = adapter.buildTestResult(dummyContext, {});
    expect(resultWithoutPayload).toEqual({
      runId: "run_test_01",
      gameId: "test_game",
      score: 0,
      completed: false,
      durationMs: 40000,
      metrics: {
        coinsCollected: 0,
        enemiesDefeated: 0
      },
      secretsFound: []
    });
  });

  it("AsteroidsArcadeAdapter builds exact result structure with and without score payload", () => {
    const adapter = new TestAsteroidsAdapter();

    const resultWithPayload = adapter.buildTestResult(dummyContext, {
      score: 1500,
      completed: true,
      durationMs: 35000,
      collisions: 2,
      asteroidsDestroyed: 12,
      foundBlackBox: true
    });

    expect(resultWithPayload).toEqual({
      runId: "run_test_01",
      gameId: "test_game",
      score: 1500,
      completed: true,
      durationMs: 35000,
      metrics: {
        collisions: 2,
        asteroidsDestroyed: 12
      },
      secretsFound: ["black_box_fragment"]
    });

    const resultWithoutPayload = adapter.buildTestResult(dummyContext, {});
    expect(resultWithoutPayload).toEqual({
      runId: "run_test_01",
      gameId: "test_game",
      score: 0,
      completed: false,
      durationMs: 30000,
      metrics: {
        collisions: 0,
        asteroidsDestroyed: 0
      },
      secretsFound: []
    });
  });

  it("SpaceInvadersArcadeAdapter builds exact result payload", () => {
    const adapter = new TestSpaceInvadersAdapter();

    const payloadResult = adapter.buildTestPayload(dummyContext, {
      damageTaken: 2,
      invadersDestroyed: 20,
      foundTransmissions: true
    });

    expect(payloadResult).toEqual({
      metrics: {
        damageTaken: 2,
        invadersDestroyed: 20
      },
      secretsFound: ["mothership_transmissions"]
    });

    const emptyPayloadResult = adapter.buildTestPayload(dummyContext, {});
    expect(emptyPayloadResult).toEqual({
      metrics: {
        damageTaken: 0,
        invadersDestroyed: 0
      },
      secretsFound: []
    });
  });

  it("GeometryWarsArcadeAdapter builds exact result payload", () => {
    const adapter = new TestGeometryWarsAdapter();

    const payloadResult = adapter.buildTestPayload(dummyContext, {
      maxMultiplier: 10,
      geomsCollected: 150,
      foundQuantumCore: true
    });

    expect(payloadResult).toEqual({
      metrics: {
        maxMultiplier: 10,
        geomsCollected: 150
      },
      secretsFound: ["quantum_singularity_core"]
    });

    const emptyPayloadResult = adapter.buildTestPayload(dummyContext, {});
    expect(emptyPayloadResult).toEqual({
      metrics: {
        maxMultiplier: 1,
        geomsCollected: 0
      },
      secretsFound: []
    });
  });
});
