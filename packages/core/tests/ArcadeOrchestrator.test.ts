import {
  ArcadeOrchestrator,
  StoryRuntime,
  StoryGraph,
  MiniGameEncounter,
  MiniGameResult
} from "../src";

describe("ArcadeOrchestrator Direct Unit Tests", () => {
  const minimalGraph: StoryGraph = {
    id: "orchestrator_unit_graph",
    title: "Orchestrator Unit Graph",
    entryNodeId: "gameplay_node",
    nodes: {
      gameplay_node: {
        id: "gameplay_node",
        type: "gameplay",
        title: "Test Gameplay",
        objective: {
          id: "obj_test",
          titleKey: "Obj Test",
          descriptionKey: "Complete test objective",
          targetCount: 1,
          currentCount: 0,
          completed: false
        },
        transitions: [
          {
            targetNodeId: "node_next",
            condition: { type: "objective", key: "obj_test", operator: "==", value: true }
          }
        ]
      },
      node_next: {
        id: "node_next",
        type: "dialogue",
        title: "Next Narrative Node",
        isEndNode: true
      }
    }
  };

  const minimalEncounter: MiniGameEncounter = {
    id: "enc_minimal_01",
    gameId: "asteroids",
    baseConfig: {
      difficulty: "normal",
      timeLimitMs: 30000,
      targetScore: 100
    },
    outcomeRules: [
      {
        id: "rule_complete_objective",
        priority: 10,
        condition: {
          field: "completed",
          operator: "==",
          value: true
        },
        effects: [
          {
            type: "completeObjective",
            objectiveId: "obj_test"
          }
        ]
      }
    ]
  };

  it("executes 'finish minigame -> effect -> objective completion -> auto node transition' in a single compact flow", () => {
    const runtime = new StoryRuntime(minimalGraph);
    const orchestrator = new ArcadeOrchestrator({ runtime });

    expect(runtime.getCurrentNodeId()).toBe("gameplay_node");

    // Start run and transition orchestrator to playing
    const runContext = orchestrator.startRun(minimalEncounter, runtime.getState());
    orchestrator.notifyPlaying();

    const result: MiniGameResult = {
      runId: runContext.runId,
      gameId: "asteroids",
      score: 500,
      completed: true,
      durationMs: 15000,
      metrics: {},
      secretsFound: []
    };

    // Submit valid result
    const returnedEffects = orchestrator.submitResult(result);

    // Single compact assertion verifying returned effects, objective completion, and automatic node transition
    expect({
      returnedEffects,
      objectiveCompleted: runtime.getState().objectives["obj_test"]?.completed,
      currentNodeId: runtime.getCurrentNodeId()
    }).toEqual({
      returnedEffects: [
        {
          type: "completeObjective",
          objectiveId: "obj_test"
        }
      ],
      objectiveCompleted: true,
      currentNodeId: "node_next"
    });
  });

  it("ignores submission with mismatched runId without mutating narrative state", () => {
    const runtime = new StoryRuntime(minimalGraph);
    const orchestrator = new ArcadeOrchestrator({ runtime });

    const runContext = orchestrator.startRun(minimalEncounter, runtime.getState());
    orchestrator.notifyPlaying();

    const invalidResult: MiniGameResult = {
      runId: "stale_or_invalid_run_id",
      gameId: "asteroids",
      score: 500,
      completed: true,
      durationMs: 15000,
      metrics: {},
      secretsFound: []
    };

    const returnedEffects = orchestrator.submitResult(invalidResult);

    expect(returnedEffects).toBeNull();
    expect(runtime.getState().objectives["obj_test"]?.completed).toBe(false);
    expect(runtime.getCurrentNodeId()).toBe("gameplay_node");
  });

  it("evaluates outcome rules matching secondaryObjectives in MiniGameResult", () => {
    const runtime = new StoryRuntime(minimalGraph);
    const orchestrator = new ArcadeOrchestrator({ runtime });

    const encounterWithSecondary: MiniGameEncounter = {
      id: "enc_secondary_01",
      gameId: "asteroids",
      outcomeRules: [
        {
          id: "rule_no_damage_bonus",
          priority: 20,
          condition: {
            secondaryObjective: "no_damage",
            operator: "==",
            value: true
          },
          effects: [
            { type: "setFlag", key: "flawlessDefense", value: true }
          ]
        }
      ]
    };

    const runContext = orchestrator.startRun(encounterWithSecondary, runtime.getState());
    orchestrator.notifyPlaying();

    const result: MiniGameResult = {
      runId: runContext.runId,
      gameId: "asteroids",
      score: 1000,
      completed: true,
      durationMs: 20000,
      metrics: {},
      secretsFound: [],
      secondaryObjectives: {
        no_damage: true,
        bonus_targets: 3
      }
    };

    const effects = orchestrator.submitResult(result);
    expect(effects).toEqual([{ type: "setFlag", key: "flawlessDefense", value: true }]);
    expect(runtime.getFlag("flawlessDefense")).toBe(true);
  });
});
