import {
  ArcadeDebugRun,
  ArcadeDebugRunManager,
  ARCADE_DEBUG_RUN_VERSION,
  MiniGameResult,
  MiniGameRunContext,
  StoryRuntimeSnapshot
} from "../src/story";

describe("ArcadeDebugRun & Replay Manager Test Suite", () => {
  const mockContext: MiniGameRunContext = {
    runId: "run_test_123",
    encounterId: "escape_route_01",
    gameId: "asteroids",
    seed: 12345,
    config: { targetScore: 1000 },
    modifiers: [{ id: "m1", targetProperty: "shieldMultiplier", value: 0.5 }]
  };

  const mockSnapshot: StoryRuntimeSnapshot = {
    graphId: "graph_1",
    currentNodeId: "node_start",
    flags: { reactorOnline: true },
    variables: { oxygen: 100 },
    selectedChoices: [],
    objectives: {},
    history: ["node_start"]
  };

  const mockResult: MiniGameResult = {
    runId: "run_test_123",
    gameId: "asteroids",
    score: 1200,
    completed: true,
    durationMs: 45000,
    metrics: { collisions: 5 },
    secretsFound: ["black_box_fragment"]
  };

  const mockDebugRun: ArcadeDebugRun = {
    version: ARCADE_DEBUG_RUN_VERSION,
    encounterId: "escape_route_01",
    runContext: mockContext,
    initialStorySnapshot: mockSnapshot,
    replay: {
      version: 1,
      game: "asteroids",
      seed: 12345,
      initialSnapshot: { entities: [], resources: {} } as any,
      inputs: [{ t: 0, b: 1 }]
    },
    expectedResult: mockResult,
    matchedRuleIds: ["rule_a_success", "rule_b_severe_damage"],
    generatedEffects: [
      { type: "setFlag", key: "escapedDebrisField", value: true },
      { type: "incrementVariable", key: "oxygen", amount: -25 }
    ]
  };

  it("serializes and deserializes ArcadeDebugRun accurately", () => {
    const json = ArcadeDebugRunManager.serialize(mockDebugRun);
    expect(typeof json).toBe("string");

    const restored = ArcadeDebugRunManager.deserialize(json);
    expect(restored.version).toBe(ARCADE_DEBUG_RUN_VERSION);
    expect(restored.encounterId).toBe("escape_route_01");
    expect(restored.matchedRuleIds).toEqual(["rule_a_success", "rule_b_severe_damage"]);
    expect(restored.generatedEffects.length).toBe(2);
  });

  it("throws exception when deserializing unsupported or invalid versions", () => {
    const invalidVersionData = { ...mockDebugRun, version: 99 };
    const json = JSON.stringify(invalidVersionData);

    expect(() => ArcadeDebugRunManager.deserialize(json)).toThrow(
      /Unsupported debug run version: 99/
    );
  });

  it("throws exception when missing required debug run fields", () => {
    const incompleteData = { version: ARCADE_DEBUG_RUN_VERSION, encounterId: "test" };
    const json = JSON.stringify(incompleteData);

    expect(() => ArcadeDebugRunManager.deserialize(json)).toThrow(
      /Missing required fields/
    );
  });
});
