import {
  GameplayEvent,
  MidGameDirectorRule,
  MidGameNarrativeDirector,
  StoryRuntimeSnapshot,
  StoryGraph,
  StoryRuntime,
  MiniGameResult
} from "../src/story";
import { EventBus } from "../src/events/EventBus";

describe("MidGameNarrativeDirector Test Suite", () => {
  const mockSnapshot: StoryRuntimeSnapshot = {
    graphId: "graph_1",
    currentNodeId: "node_1",
    flags: {},
    variables: { reactorPower: 30 },
    selectedChoices: [],
    objectives: {},
    history: []
  };

  const shieldRule: MidGameDirectorRule = {
    id: "rule_shield_low",
    eventName: "ShieldCritical",
    condition: (_event, snapshot) => {
      const power = typeof snapshot.variables.reactorPower === "number" ? snapshot.variables.reactorPower : 100;
      return power < 50;
    },
    cue: {
      id: "cue_shield_warning",
      type: "radio",
      priority: 10,
      titleKey: "ARES WARNING",
      rawText: "Reactor power depleted! Shielding compromised.",
      durationMs: 3000,
      audioCueId: "sfx_alarm_01"
    },
    cooldownMs: 5000,
    maxTriggersPerRun: 2
  };

  it("evaluates matching gameplay event and generates narrative cue", () => {
    const director = new MidGameNarrativeDirector([shieldRule]);
    const event: GameplayEvent = {
      id: "ev_1",
      name: "ShieldCritical",
      timestamp: 10000
    };

    const cue = director.evaluateEvent(event, mockSnapshot);
    expect(cue).not.toBeNull();
    expect(cue?.id).toBe("cue_shield_warning");
    expect(cue?.audioCueId).toBe("sfx_alarm_01");
  });

  it("enforces cooldownMs constraint between consecutive events", () => {
    const director = new MidGameNarrativeDirector([shieldRule]);
    const event1: GameplayEvent = { id: "e1", name: "ShieldCritical", timestamp: 10000 };
    const event2: GameplayEvent = { id: "e2", name: "ShieldCritical", timestamp: 12000 }; // Only 2000ms later (cooldown is 5000ms)

    const cue1 = director.evaluateEvent(event1, mockSnapshot);
    expect(cue1).not.toBeNull();

    const cue2 = director.evaluateEvent(event2, mockSnapshot);
    expect(cue2).toBeNull(); // Blocked by cooldownMs
  });

  it("enforces maxTriggersPerRun constraint", () => {
    const director = new MidGameNarrativeDirector([shieldRule]);
    const e1: GameplayEvent = { id: "e1", name: "ShieldCritical", timestamp: 10000 };
    const e2: GameplayEvent = { id: "e2", name: "ShieldCritical", timestamp: 20000 };
    const e3: GameplayEvent = { id: "e3", name: "ShieldCritical", timestamp: 30000 };

    expect(director.evaluateEvent(e1, mockSnapshot)).not.toBeNull();
    expect(director.evaluateEvent(e2, mockSnapshot)).not.toBeNull();
    expect(director.evaluateEvent(e3, mockSnapshot)).toBeNull(); // Blocked: maxTriggersPerRun is 2
  });

  it("intercepts minigame game:over result and branches narrative based on mechanical performance", () => {
    const testGraph: StoryGraph = {
      id: "adaptive_director_test",
      title: "Adaptive Director Test",
      entryNodeId: "node_arcade_stage",
      nodes: {
        node_arcade_stage: {
          id: "node_arcade_stage",
          type: "gameplay",
          transitions: [
            {
              targetNodeId: "node_eval_performance",
              condition: { type: "event", key: "game:over" }
            }
          ]
        },
        node_eval_performance: {
          id: "node_eval_performance",
          type: "branch",
          transitions: [
            {
              targetNodeId: "node_flawless_debrief",
              condition: { type: "variable", key: "playerPerformance", value: "perfect", operator: "==" },
              priority: 10
            },
            {
              targetNodeId: "node_failure_debrief",
              condition: { type: "variable", key: "playerPerformance", value: "poor", operator: "==" },
              priority: 5
            },
            {
              targetNodeId: "node_standard_debrief",
              priority: 0
            }
          ]
        },
        node_flawless_debrief: {
          id: "node_flawless_debrief",
          type: "dialogue",
          dialogue: { id: "d_flawless", lines: [{ textKey: "Outstanding performance!" }] }
        },
        node_failure_debrief: {
          id: "node_failure_debrief",
          type: "dialogue",
          dialogue: { id: "d_fail", lines: [{ textKey: "Mission failed miserably." }] }
        },
        node_standard_debrief: {
          id: "node_standard_debrief",
          type: "dialogue",
          dialogue: { id: "d_std", lines: [{ textKey: "Mission accomplished." }] }
        }
      }
    };

    const eventBus = new EventBus();
    const runtime = new StoryRuntime(testGraph);
    const director = new MidGameNarrativeDirector();

    director.bindEventBus(eventBus, runtime);
    runtime.bindEventBus(eventBus);

    expect(runtime.getCurrentNode()?.id).toBe("node_arcade_stage");

    // Case 1: Fail minigame miserably (score 100, completed: false)
    const poorResult: MiniGameResult = {
      runId: "run_poor",
      gameId: "asteroids",
      score: 100,
      completed: false,
      durationMs: 4000,
      metrics: {},
      secretsFound: []
    };

    eventBus.emit("game:over", { ...poorResult });

    expect(runtime.getState().variables.playerPerformance).toBe("poor");
    expect(runtime.getCurrentNode()?.id).toBe("node_failure_debrief");

    // Case 2: Flawless performance (score 5000, completed: true)
    runtime.loadGraph(testGraph, true);
    expect(runtime.getCurrentNode()?.id).toBe("node_arcade_stage");

    const perfectResult: MiniGameResult = {
      runId: "run_perfect",
      gameId: "asteroids",
      score: 5000,
      completed: true,
      durationMs: 12000,
      metrics: {},
      secretsFound: []
    };

    eventBus.emit("game:over", { ...perfectResult });

    expect(runtime.getState().variables.playerPerformance).toBe("perfect");
    expect(runtime.getCurrentNode()?.id).toBe("node_flawless_debrief");
  });
});
