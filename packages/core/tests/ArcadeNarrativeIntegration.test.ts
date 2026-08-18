import {
  MiniGameModifierResolver,
  OutcomeRuleEngine,
  StoryEffectApplier,
  ArcadeOrchestrator,
  StoryRuntime,
  StoryGraph,
  StoryRuntimeSnapshot,
  MiniGameResult,
  StoryEffect,
  MiniGameModifier,
  MiniGameEncounter
} from "../src";

describe("Narrative ↔ Arcade Core Integration Test Suite", () => {
  let resolver: MiniGameModifierResolver;
  let ruleEngine: OutcomeRuleEngine;
  let effectApplier: StoryEffectApplier;

  const mockEncounter: MiniGameEncounter = {
    id: "test_encounter_01",
    gameId: "test_game",
    baseConfig: {
      difficulty: "normal",
      timeLimitMs: 60000,
      targetScore: 1000
    },
    modifierRules: [
      {
        id: "power_rule",
        condition: (snapshot: StoryRuntimeSnapshot) => {
          const power = typeof snapshot.variables.power === "number" ? snapshot.variables.power : 100;
          return power < 50;
        },
        modifier: {
          id: "low_power_penalty",
          targetProperty: "speedMultiplier",
          value: 0.5
        }
      },
      {
        id: "radar_rule",
        condition: (snapshot: StoryRuntimeSnapshot) => !!snapshot.flags.radarUnlocked,
        modifier: {
          id: "radar_assist",
          targetProperty: "radarAssist",
          value: true
        }
      }
    ],
    outcomeRules: [
      {
        id: "rule_success",
        priority: 10,
        condition: {
          field: "completed",
          operator: "==",
          value: true
        },
        effects: [
          {
            type: "setFlag",
            key: "missionAccomplished",
            value: true
          }
        ]
      },
      {
        id: "rule_damage",
        priority: 20,
        condition: {
          metric: "damageTaken",
          operator: ">=",
          value: 5
        },
        effects: [
          {
            type: "incrementVariable",
            key: "health",
            amount: -25
          },
          {
            type: "setFlag",
            key: "hullDamaged",
            value: true
          }
        ]
      },
      {
        id: "rule_secret",
        priority: 30,
        condition: {
          secret: "secret_data_chip"
        },
        effects: [
          {
            type: "discoverEvidence",
            evidenceId: "secret_data_chip"
          }
        ]
      }
    ]
  };

  beforeEach(() => {
    resolver = new MiniGameModifierResolver();
    ruleEngine = new OutcomeRuleEngine();
    effectApplier = new StoryEffectApplier();
  });

  describe("1. MiniGameModifierResolver", () => {
    it("derives domain-specific modifiers correctly from StoryRuntimeSnapshot without narrative leaks", () => {
      const snapshot: StoryRuntimeSnapshot = {
        graphId: "test_graph",
        currentNodeId: "node_01",
        flags: { radarUnlocked: true },
        variables: { power: 30 },
        selectedChoices: [],
        objectives: {},
        evidence: [],
        history: ["node_01"]
      };

      const modifiers = resolver.resolve(snapshot, mockEncounter);
      expect(modifiers).toHaveLength(2);

      const speedMod = modifiers.find((m: MiniGameModifier) => m.targetProperty === "speedMultiplier");
      expect(speedMod).toBeDefined();
      expect(speedMod?.value).toBe(0.5);

      const radarMod = modifiers.find((m: MiniGameModifier) => m.targetProperty === "radarAssist");
      expect(radarMod).toBeDefined();
      expect(radarMod?.value).toBe(true);
    });

    it("returns no modifiers when snapshot conditions do not trigger rules", () => {
      const snapshot: StoryRuntimeSnapshot = {
        graphId: "test_graph",
        currentNodeId: "node_01",
        flags: {},
        variables: { power: 100 },
        selectedChoices: [],
        objectives: {},
        evidence: [],
        history: ["node_01"]
      };

      const modifiers = resolver.resolve(snapshot, mockEncounter);
      expect(modifiers).toHaveLength(0);
    });
  });

  describe("2. OutcomeRuleEngine (DSL Evaluation)", () => {
    it("handles simple success outcome rule", () => {
      const resultSuccess: MiniGameResult = {
        runId: "run_123",
        gameId: "test_game",
        score: 1500,
        completed: true,
        durationMs: 45000,
        metrics: { damageTaken: 2 },
        secretsFound: []
      };

      const effects = ruleEngine.evaluate(resultSuccess, mockEncounter.outcomeRules);
      expect(effects).toContainEqual({
        type: "setFlag",
        key: "missionAccomplished",
        value: true
      });
      expect(effects).not.toContainEqual({
        type: "setFlag",
        key: "hullDamaged",
        value: true
      });
    });

    it("handles failure without triggering success rules", () => {
      const resultFailure: MiniGameResult = {
        runId: "run_123",
        gameId: "test_game",
        score: 200,
        completed: false,
        durationMs: 12000,
        metrics: { damageTaken: 1 },
        secretsFound: []
      };

      const effects = ruleEngine.evaluate(resultFailure, mockEncounter.outcomeRules);
      expect(effects).toHaveLength(0);
    });

    it("evaluates multiple rules simultaneously (cumulative effects)", () => {
      const resultAll: MiniGameResult = {
        runId: "run_123",
        gameId: "test_game",
        score: 2000,
        completed: true,
        durationMs: 50000,
        metrics: { damageTaken: 6 },
        secretsFound: ["secret_data_chip"]
      };

      const effects = ruleEngine.evaluate(resultAll, mockEncounter.outcomeRules);

      expect(effects).toContainEqual({
        type: "setFlag",
        key: "missionAccomplished",
        value: true
      });
      expect(effects).toContainEqual({
        type: "incrementVariable",
        key: "health",
        amount: -25
      });
      expect(effects).toContainEqual({
        type: "setFlag",
        key: "hullDamaged",
        value: true
      });
      expect(effects).toContainEqual({
        type: "discoverEvidence",
        evidenceId: "secret_data_chip"
      });
    });

    it("sorts rules by priority descending", () => {
      const customRules = [
        {
          id: "low_priority",
          priority: 5,
          condition: { field: "completed" as const, operator: "==" as const, value: true },
          effects: [{ type: "setFlag" as const, key: "lowPriorityFlag", value: true }]
        },
        {
          id: "high_priority",
          priority: 100,
          condition: { field: "completed" as const, operator: "==" as const, value: true },
          effects: [{ type: "setFlag" as const, key: "highPriorityFlag", value: true }]
        }
      ];

      const result: MiniGameResult = {
        runId: "run_1",
        gameId: "test_game",
        score: 100,
        completed: true,
        durationMs: 1000,
        metrics: {},
        secretsFound: []
      };

      const effects = ruleEngine.evaluate(result, customRules);
      expect(effects[0]).toEqual({ type: "setFlag", key: "highPriorityFlag", value: true });
      expect(effects[1]).toEqual({ type: "setFlag", key: "lowPriorityFlag", value: true });
    });

    it("respects stopProcessing flag when present on a triggered rule", () => {
      const customRules = [
        {
          id: "stop_rule",
          priority: 100,
          condition: { field: "completed" as const, operator: "==" as const, value: true },
          effects: [{ type: "setFlag" as const, key: "stoppedFlag", value: true }],
          stopProcessing: true
        },
        {
          id: "ignored_rule",
          priority: 10,
          condition: { field: "completed" as const, operator: "==" as const, value: true },
          effects: [{ type: "setFlag" as const, key: "neverReachedFlag", value: true }]
        }
      ];

      const result: MiniGameResult = {
        runId: "run_1",
        gameId: "test_game",
        score: 100,
        completed: true,
        durationMs: 1000,
        metrics: {},
        secretsFound: []
      };

      const effects = ruleEngine.evaluate(result, customRules);
      expect(effects).toHaveLength(1);
      expect(effects[0]).toEqual({ type: "setFlag", key: "stoppedFlag", value: true });
    });

    it("evaluates all, any, and not combinators properly", () => {
      const combinatorRule = {
        id: "combinator_rule",
        priority: 1,
        condition: {
          all: [
            { field: "completed" as const, operator: "==" as const, value: true },
            {
              any: [
                { metric: "damageTaken", operator: "<" as const, value: 3 },
                { secret: "golden_key" }
              ]
            },
            {
              not: { metric: "damageTaken", operator: ">=" as const, value: 10 }
            }
          ]
        },
        effects: [{ type: "setFlag" as const, key: "combinatorPassed", value: true }]
      };

      const matchingResult: MiniGameResult = {
        runId: "run_1",
        gameId: "test_game",
        score: 500,
        completed: true,
        durationMs: 1000,
        metrics: { damageTaken: 1 },
        secretsFound: []
      };

      expect(ruleEngine.evaluate(matchingResult, [combinatorRule])).toHaveLength(1);

      const nonMatchingResult: MiniGameResult = {
        runId: "run_1",
        gameId: "test_game",
        score: 500,
        completed: true,
        durationMs: 1000,
        metrics: { damageTaken: 15 },
        secretsFound: []
      };

      expect(ruleEngine.evaluate(nonMatchingResult, [combinatorRule])).toHaveLength(0);
    });

    it("safely evaluates missing metrics without throwing errors", () => {
      const metricRule = {
        id: "missing_metric",
        priority: 1,
        condition: { metric: "nonExistentMetric", operator: ">" as const, value: 10 },
        effects: [{ type: "setFlag" as const, key: "never", value: true }]
      };

      const result: MiniGameResult = {
        runId: "run_1",
        gameId: "test_game",
        score: 100,
        completed: true,
        durationMs: 1000,
        metrics: {},
        secretsFound: []
      };

      expect(ruleEngine.evaluate(result, [metricRule])).toHaveLength(0);
    });

    it("handles secret found and secret not found checks", () => {
      const resultWithSecret: MiniGameResult = {
        runId: "run_1",
        gameId: "test_game",
        score: 100,
        completed: true,
        durationMs: 1000,
        metrics: {},
        secretsFound: ["secret_data_chip"]
      };

      const resultWithoutSecret: MiniGameResult = {
        ...resultWithSecret,
        secretsFound: []
      };

      const effectsWith = ruleEngine.evaluate(resultWithSecret, mockEncounter.outcomeRules);
      const effectsWithout = ruleEngine.evaluate(resultWithoutSecret, mockEncounter.outcomeRules);

      expect(effectsWith.some((e: StoryEffect) => e.type === "discoverEvidence")).toBe(true);
      expect(effectsWithout.some((e: StoryEffect) => e.type === "discoverEvidence")).toBe(false);
    });

    it("handles unknown encounter or empty rule sets gracefully", () => {
      const emptyEncounter: MiniGameEncounter = {
        id: "unknown_encounter",
        gameId: "unknown_game",
        outcomeRules: []
      };

      const result: MiniGameResult = {
        runId: "run_1",
        gameId: "unknown_game",
        score: 100,
        completed: true,
        durationMs: 1000,
        metrics: {},
        secretsFound: []
      };

      const effects = ruleEngine.evaluate(result, emptyEncounter.outcomeRules);
      expect(effects).toEqual([]);
    });
  });

  describe("3. StoryEffectApplier", () => {
    it("applies effects cleanly and strictly to StoryRuntime", () => {
      const graph: StoryGraph = {
        id: "test_graph",
        title: "Test Graph",
        entryNodeId: "start",
        nodes: {
          start: { id: "start", type: "dialogue" },
          target_node: { id: "target_node", type: "dialogue" }
        }
      };

      const runtime = new StoryRuntime(graph);
      const effects: StoryEffect[] = [
        { type: "setFlag", key: "flagA", value: true },
        { type: "setVariable", key: "varB", value: 42 },
        { type: "incrementVariable", key: "varB", amount: 10 },
        { type: "discoverEvidence", evidenceId: "ev_01" },
        { type: "completeObjective", objectiveId: "obj_01" },
        { type: "navigateToNode", nodeId: "target_node" }
      ];

      effectApplier.applyEffects(runtime, effects);

      const state = runtime.getState();
      expect(state.flags["flagA"]).toBe(true);
      expect(state.variables["varB"]).toBe(52);
      expect(state.evidence).toContain("ev_01");
      expect(state.objectives["obj_01"]?.completed).toBe(true);
      expect(state.currentNodeId).toBe("target_node");
    });
  });

  describe("4. ArcadeOrchestrator Lifecycle & Guard Rules", () => {
    let testGraph: StoryGraph;
    let runtime: StoryRuntime;
    let orchestrator: ArcadeOrchestrator;

    beforeEach(() => {
      testGraph = {
        id: "test_graph",
        title: "Test Graph",
        entryNodeId: "start",
        nodes: {
          start: { id: "start", type: "dialogue" }
        }
      };
      runtime = new StoryRuntime(testGraph);
      orchestrator = new ArcadeOrchestrator({ runtime });
    });

    it("prevents starting two active runs simultaneously", () => {
      const snapshot = runtime.getState();
      orchestrator.startRun(mockEncounter, snapshot);

      expect(() => {
        orchestrator.startRun(mockEncounter, snapshot);
      }).toThrow();
    });

    it("ignores results with invalid / mismatched runId", () => {
      const snapshot = runtime.getState();
      orchestrator.startRun(mockEncounter, snapshot);
      orchestrator.notifyPlaying();

      const invalidResult: MiniGameResult = {
        runId: "wrong_run_id",
        gameId: "test_game",
        score: 1000,
        completed: true,
        durationMs: 30000,
        metrics: {},
        secretsFound: []
      };

      const appliedEffects = orchestrator.submitResult(invalidResult);
      expect(appliedEffects).toBeNull();
      expect(orchestrator.getState()).toBe("playing");
    });

    it("guarantees a run result is only resolved once", () => {
      const snapshot = runtime.getState();
      const context = orchestrator.startRun(mockEncounter, snapshot);
      orchestrator.notifyPlaying();

      const validResult: MiniGameResult = {
        runId: context.runId,
        gameId: "test_game",
        score: 1000,
        completed: true,
        durationMs: 30000,
        metrics: {},
        secretsFound: []
      };

      const firstSubmission = orchestrator.submitResult(validResult);
      expect(firstSubmission).not.toBeNull();

      const duplicateSubmission = orchestrator.submitResult(validResult);
      expect(duplicateSubmission).toBeNull();
    });

    it("supports abort during execution", () => {
      const snapshot = runtime.getState();
      orchestrator.startRun(mockEncounter, snapshot);
      orchestrator.notifyPlaying();

      orchestrator.abort("user_cancelled");
      expect(orchestrator.getState()).toBe("aborted");
    });

    it("supports reporting loading or execution error", () => {
      const snapshot = runtime.getState();
      orchestrator.startRun(mockEncounter, snapshot);

      orchestrator.reportError("Failed to load textures");
      expect(orchestrator.getState()).toBe("failed");
    });
  });
});
