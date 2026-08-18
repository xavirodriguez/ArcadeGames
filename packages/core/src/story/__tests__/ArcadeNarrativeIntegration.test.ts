import { MiniGameModifierResolver } from "../MiniGameModifierResolver";
import { OutcomeRuleEngine } from "../OutcomeRuleEngine";
import { StoryEffectApplier } from "../StoryEffectApplier";
import { ArcadeOrchestrator } from "../ArcadeOrchestrator";
import { StoryRuntime } from "../StoryRuntime";
import { StoryGraph, StoryEffect } from "../StoryTypes";
import {
  StoryRuntimeSnapshot,
  MiniGameResult,
  MiniGameModifier,
  MiniGameEncounter
} from "../ArcadeIntegrationTypes";
import {
  escapeRoute01Encounter
} from "../../../../../src/games/asteroids/story/EscapeRouteEncounter";

describe("Narrative ↔ Arcade Integration Test Suite", () => {
  let resolver: MiniGameModifierResolver;
  let ruleEngine: OutcomeRuleEngine;
  let effectApplier: StoryEffectApplier;

  beforeEach(() => {
    resolver = new MiniGameModifierResolver();
    ruleEngine = new OutcomeRuleEngine();
    effectApplier = new StoryEffectApplier();
  });

  describe("1. MiniGameModifierResolver", () => {
    it("derives modifiers correctly from StoryRuntimeSnapshot (reactor power & navigation data)", () => {
      const snapshotLowPower: StoryRuntimeSnapshot = {
        graphId: "test_graph",
        currentNodeId: "node_01",
        flags: { navigationData: true },
        variables: { reactorPower: 30 },
        selectedChoices: [],
        objectives: {},
        evidence: [],
        history: ["node_01"]
      };

      const modifiers = resolver.resolve(snapshotLowPower, escapeRoute01Encounter);
      expect(modifiers).toHaveLength(2);

      const shieldMod = modifiers.find((m: MiniGameModifier) => m.targetProperty === "shieldMultiplier");
      expect(shieldMod).toBeDefined();
      expect(shieldMod?.value).toBe(0.5);

      const navMod = modifiers.find((m: MiniGameModifier) => m.targetProperty === "navigationAssist");
      expect(navMod).toBeDefined();
      expect(navMod?.value).toBe(true);
    });

    it("returns no modifiers when snapshot conditions do not trigger rules", () => {
      const snapshotNormal: StoryRuntimeSnapshot = {
        graphId: "test_graph",
        currentNodeId: "node_01",
        flags: {},
        variables: { reactorPower: 100 },
        selectedChoices: [],
        objectives: {},
        evidence: [],
        history: ["node_01"]
      };

      const modifiers = resolver.resolve(snapshotNormal, escapeRoute01Encounter);
      expect(modifiers).toHaveLength(0);
    });
  });

  describe("2. OutcomeRuleEngine (DSL Evaluation)", () => {
    it("handles simple success outcome rule", () => {
      const resultSuccess: MiniGameResult = {
        runId: "run_123",
        gameId: "asteroids",
        score: 1500,
        completed: true,
        durationMs: 45000,
        metrics: { collisions: 2 },
        secretsFound: []
      };

      const effects = ruleEngine.evaluate(resultSuccess, escapeRoute01Encounter.outcomeRules);
      expect(effects).toContainEqual({
        type: "setFlag",
        key: "escapedDebrisField",
        value: true
      });
      expect(effects).not.toContainEqual({
        type: "setFlag",
        key: "escapeShipDamaged",
        value: true
      });
    });

    it("handles failure without triggering success rules", () => {
      const resultFailure: MiniGameResult = {
        runId: "run_123",
        gameId: "asteroids",
        score: 200,
        completed: false,
        durationMs: 12000,
        metrics: { collisions: 1 },
        secretsFound: []
      };

      const effects = ruleEngine.evaluate(resultFailure, escapeRoute01Encounter.outcomeRules);
      expect(effects).toHaveLength(0);
    });

    it("evaluates multiple rules simultaneously (cumulative A + B + C effects)", () => {
      const resultAll: MiniGameResult = {
        runId: "run_123",
        gameId: "asteroids",
        score: 2000,
        completed: true,
        durationMs: 50000,
        metrics: { collisions: 6 },
        secretsFound: ["black_box_fragment"]
      };

      const effects = ruleEngine.evaluate(resultAll, escapeRoute01Encounter.outcomeRules);

      // Rule A effect
      expect(effects).toContainEqual({
        type: "setFlag",
        key: "escapedDebrisField",
        value: true
      });

      // Rule B effects
      expect(effects).toContainEqual({
        type: "incrementVariable",
        key: "oxygen",
        amount: -25
      });
      expect(effects).toContainEqual({
        type: "setFlag",
        key: "escapeShipDamaged",
        value: true
      });

      // Rule C effect
      expect(effects).toContainEqual({
        type: "discoverEvidence",
        evidenceId: "black_box_fragment"
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
        gameId: "asteroids",
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
        gameId: "asteroids",
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
                { metric: "collisions", operator: "<" as const, value: 3 },
                { secret: "golden_key" }
              ]
            },
            {
              not: { metric: "collisions", operator: ">=" as const, value: 10 }
            }
          ]
        },
        effects: [{ type: "setFlag" as const, key: "combinatorPassed", value: true }]
      };

      const matchingResult: MiniGameResult = {
        runId: "run_1",
        gameId: "asteroids",
        score: 500,
        completed: true,
        durationMs: 1000,
        metrics: { collisions: 1 },
        secretsFound: []
      };

      expect(ruleEngine.evaluate(matchingResult, [combinatorRule])).toHaveLength(1);

      const nonMatchingResult: MiniGameResult = {
        runId: "run_1",
        gameId: "asteroids",
        score: 500,
        completed: true,
        durationMs: 1000,
        metrics: { collisions: 15 },
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
        gameId: "asteroids",
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
        gameId: "asteroids",
        score: 100,
        completed: true,
        durationMs: 1000,
        metrics: {},
        secretsFound: ["black_box_fragment"]
      };

      const resultWithoutSecret: MiniGameResult = {
        ...resultWithSecret,
        secretsFound: []
      };

      const effectsWith = ruleEngine.evaluate(resultWithSecret, escapeRoute01Encounter.outcomeRules);
      const effectsWithout = ruleEngine.evaluate(resultWithoutSecret, escapeRoute01Encounter.outcomeRules);

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
      orchestrator.startRun(escapeRoute01Encounter, snapshot);

      expect(() => {
        orchestrator.startRun(escapeRoute01Encounter, snapshot);
      }).toThrow();
    });

    it("ignores results with invalid / mismatched runId", () => {
      const snapshot = runtime.getState();
      orchestrator.startRun(escapeRoute01Encounter, snapshot);
      orchestrator.notifyPlaying();

      const invalidResult: MiniGameResult = {
        runId: "wrong_run_id",
        gameId: "asteroids",
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
      const context = orchestrator.startRun(escapeRoute01Encounter, snapshot);
      orchestrator.notifyPlaying();

      const validResult: MiniGameResult = {
        runId: context.runId,
        gameId: "asteroids",
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
      orchestrator.startRun(escapeRoute01Encounter, snapshot);
      orchestrator.notifyPlaying();

      orchestrator.abort("user_cancelled");
      expect(orchestrator.getState()).toBe("aborted");
    });

    it("supports reporting loading or execution error", () => {
      const snapshot = runtime.getState();
      orchestrator.startRun(escapeRoute01Encounter, snapshot);

      orchestrator.reportError("Failed to load textures");
      expect(orchestrator.getState()).toBe("failed");
    });
  });
});
