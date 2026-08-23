import {
  StoryGraph,
  StoryRuntime,
  NarrativeTimelineEngine,
  ArcadeOrchestrator,
  MiniGameResult,
  MiniGameEncounter
} from "../src";

describe("Replayability without Ghost State (forkAt Integration Suite)", () => {
  const replayableEncounter: MiniGameEncounter = {
    id: "replayable_stage_02",
    gameId: "asteroids",
    replayable: true,
    baseConfig: {
      targetScore: 1000
    },
    outcomeRules: [
      {
        id: "rule_clean_success",
        priority: 10,
        condition: {
          field: "completed",
          operator: "==",
          value: true
        },
        effects: [
          {
            type: "setFlag",
            key: "stage2CleanVictory",
            value: true
          }
        ]
      },
      {
        id: "rule_heavy_damage",
        priority: 20,
        condition: {
          metric: "collisions",
          operator: ">=",
          value: 5
        },
        effects: [
          {
            type: "incrementVariable",
            key: "hullPenalty",
            amount: 25
          },
          {
            type: "setFlag",
            key: "stage2ShipDamaged",
            value: true
          },
          {
            type: "discoverEvidence",
            evidenceId: "damaged_black_box"
          }
        ]
      }
    ]
  };

  const testGraph: StoryGraph = {
    id: "campaign_graph",
    title: "Campaign Graph",
    entryNodeId: "node_1_map",
    nodes: {
      node_1_map: {
        id: "node_1_map",
        type: "dialogue",
        title: "Map Hub",
        checkpoint: true,
        transitions: [
          {
            targetNodeId: "node_2_stage",
            condition: { type: "flag", key: "enterStage2" }
          }
        ]
      },
      node_2_stage: {
        id: "node_2_stage",
        type: "gameplay",
        title: "Stage 2 Encounter",
        sceneToLoad: "asteroids",
        transitions: [
          {
            targetNodeId: "node_3_post_map",
            condition: { type: "flag", key: "stage2CleanVictory" }
          }
        ]
      },
      node_3_post_map: {
        id: "node_3_post_map",
        type: "dialogue",
        title: "Post Stage Map"
      }
    }
  };

  it("forkAt correctly discards ghost state, variables, evidence, and timeline events from previous executions", () => {
    const runtime = new StoryRuntime(testGraph);
    const timelineEngine = new NarrativeTimelineEngine();
    runtime.bindTimelineEngine(timelineEngine);

    const orchestrator = new ArcadeOrchestrator({ runtime });

    // 1. Initial entry at node_1_map captures checkpoint node_1_map
    expect(runtime.getState().currentNodeId).toBe("node_1_map");
    expect(runtime.getCheckpoints()).toContain("node_1_map");

    // 2. Player enters stage 2 for the 1st time (low score execution)
    runtime.setFlag("enterStage2", true);
    expect(runtime.getState().currentNodeId).toBe("node_2_stage");

    const snapshot1 = runtime.getState();
    const context1 = orchestrator.startRun(replayableEncounter, snapshot1, "node_2_stage");
    orchestrator.notifyPlaying();

    const lowScoreResult: MiniGameResult = {
      runId: context1.runId,
      gameId: "asteroids",
      score: 200,
      completed: false,
      durationMs: 30000,
      metrics: { collisions: 5 },
      secretsFound: []
    };

    // Submit low score result -> triggers rule_heavy_damage
    orchestrator.submitResult(lowScoreResult);

    const stateAfterRun1 = runtime.getState();
    expect(stateAfterRun1.flags["stage2ShipDamaged"]).toBe(true);
    expect(stateAfterRun1.variables["hullPenalty"]).toBe(25);
    expect(stateAfterRun1.evidence).toContain("damaged_black_box");

    // 3. Player decides to return to map and REPLAY Stage 2 with forkAt("node_1_map")
    runtime.forkAt("node_1_map");

    const stateAfterFork = runtime.getState();
    expect(stateAfterFork.currentNodeId).toBe("node_1_map");
    expect(stateAfterFork.flags["stage2ShipDamaged"]).toBeUndefined();
    expect(stateAfterFork.variables["hullPenalty"]).toBeUndefined();
    expect(stateAfterFork.evidence).not.toContain("damaged_black_box");
    expect(stateAfterFork.history).toEqual(["node_1_map"]);

    // 4. Replay Stage 2 for the 2nd time (high score execution)
    runtime.setFlag("enterStage2", true);
    expect(runtime.getState().currentNodeId).toBe("node_2_stage");

    const snapshot2 = runtime.getState();
    const context2 = orchestrator.startRun(replayableEncounter, snapshot2, "node_2_stage");
    orchestrator.notifyPlaying();

    const highScoreResult: MiniGameResult = {
      runId: context2.runId,
      gameId: "asteroids",
      score: 1500,
      completed: true,
      durationMs: 25000,
      metrics: { collisions: 0 },
      secretsFound: []
    };

    // Submit high score result -> triggers rule_clean_success
    orchestrator.submitResult(highScoreResult);

    const finalState = runtime.getState();

    // Verify final state contains ONLY clean victory effects and NO ghost state from 1st run
    expect(finalState.flags["stage2CleanVictory"]).toBe(true);
    expect(finalState.flags["stage2ShipDamaged"]).toBeUndefined();
    expect(finalState.variables["hullPenalty"]).toBeUndefined();
    expect(finalState.evidence).not.toContain("damaged_black_box");
    expect(finalState.currentNodeId).toBe("node_3_post_map");
  });

  it("saveCheckpoint captures explicit checkpoint snapshots on demand", () => {
    const runtime = new StoryRuntime(testGraph);
    const cp = runtime.saveCheckpoint("custom_checkpoint_01");

    expect(cp.nodeId).toBe("custom_checkpoint_01");
    expect(cp.id).toBe("checkpoint_custom_checkpoint_01");
    expect(runtime.getCheckpoints()).toContain("checkpoint_custom_checkpoint_01");
  });

  it("throws descriptive error when forkAt is called with an invalid checkpoint ID", () => {
    const runtime = new StoryRuntime(testGraph);
    expect(() => {
      runtime.forkAt("non_existent_checkpoint");
    }).toThrow("[StoryRuntime] Cannot fork at invalid checkpoint 'non_existent_checkpoint'.");
  });
});
