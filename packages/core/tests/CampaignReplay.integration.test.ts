import {
  StoryRuntime,
  StoryGraph
} from "../src";

describe("Campaign Replay & Checkpoint Integration Test Suite", () => {
  const replayStoryGraph: StoryGraph = {
    id: "replay_test_graph",
    title: "Replay Test Campaign",
    entryNodeId: "node_intro",
    nodes: {
      node_intro: {
        id: "node_intro",
        type: "dialogue",
        transitions: [{ targetNodeId: "gameplay_stage1" }]
      },
      gameplay_stage1: {
        id: "gameplay_stage1",
        type: "gameplay",
        title: "Stage 1 Asteroids",
        sceneToLoad: "asteroids",
        checkpoint: true, // Automatic checkpoint on entry
        objective: {
          id: "obj_stage1",
          titleKey: "Stage 1 Objective",
          descriptionKey: "Complete stage 1",
          targetCount: 1,
          currentCount: 0,
          completed: false
        },
        transitions: [
          {
            targetNodeId: "gameplay_stage2",
            condition: { type: "objective", key: "obj_stage1", operator: "==", value: true }
          }
        ]
      },
      gameplay_stage2: {
        id: "gameplay_stage2",
        type: "gameplay",
        title: "Stage 2 Space Invaders",
        sceneToLoad: "space-invaders",
        checkpoint: true, // Second automatic checkpoint on entry
        objective: {
          id: "obj_stage2",
          titleKey: "Stage 2 Objective",
          descriptionKey: "Complete stage 2",
          targetCount: 1,
          currentCount: 0,
          completed: false
        },
        transitions: [
          {
            targetNodeId: "permadeath_node",
            condition: { type: "objective", key: "obj_stage2", operator: "==", value: true }
          }
        ]
      },
      permadeath_node: {
        id: "permadeath_node",
        type: "dialogue",
        meta: {
          rewindPolicy: "permanent"
        },
        isEndNode: true
      }
    }
  };

  it("automatically saves checkpoint on gameplay node entry and discards ghost state via forkAt", () => {
    const runtime = new StoryRuntime(replayStoryGraph);

    // 1. Enter Stage 1 gameplay node -> trigger auto-checkpoint
    runtime.navigateToNode("gameplay_stage1");
    expect(runtime.getCurrentNodeId()).toBe("gameplay_stage1");

    const checkpoints = runtime.getCheckpoints();
    expect(checkpoints).toContain("gameplay_stage1");
    expect(checkpoints).toContain("checkpoint_gameplay_stage1");

    // 2. Simulate a failed attempt that mutates state with flags, variables, and evidence
    runtime.setFlag("failedAttempt", true);
    runtime.setFlag("damagedShip", true);
    runtime.setVariable("penaltyScore", 500);
    runtime.discoverEvidence("broken_hull_piece");

    let state = runtime.getState();
    expect(state.flags.failedAttempt).toBe(true);
    expect(state.flags.damagedShip).toBe(true);
    expect(state.variables.penaltyScore).toBe(500);
    expect(state.evidence).toContain("broken_hull_piece");

    // 3. Perform forkAt to restore clean checkpoint state
    runtime.forkAt("gameplay_stage1");

    state = runtime.getState();
    expect(runtime.getCurrentNodeId()).toBe("gameplay_stage1");
    expect(state.flags.failedAttempt).toBeUndefined();
    expect(state.flags.damagedShip).toBeUndefined();
    expect(state.variables.penaltyScore).toBeUndefined();
    expect(state.evidence).not.toContain("broken_hull_piece");
    expect(state.history).toEqual(["node_intro", "gameplay_stage1"]);
  });

  it("handles a second checkpoint cleanly on subsequent gameplay nodes", () => {
    const runtime = new StoryRuntime(replayStoryGraph);

    // Complete Stage 1 cleanly
    runtime.navigateToNode("gameplay_stage1");
    runtime.applyEffect({ type: "completeObjective", objectiveId: "obj_stage1" });

    // Transitioned to Stage 2
    expect(runtime.getCurrentNodeId()).toBe("gameplay_stage2");
    expect(runtime.getCheckpoints()).toContain("gameplay_stage2");

    // Mutate state in Stage 2 during failed attempt
    runtime.setFlag("stage2Failed", true);
    runtime.setVariable("stage2Deaths", 3);
    runtime.discoverEvidence("invader_ship_log");

    let state = runtime.getState();
    expect(state.flags.stage2Failed).toBe(true);
    expect(state.variables.stage2Deaths).toBe(3);
    expect(state.evidence).toContain("invader_ship_log");

    // Fork at Stage 2 checkpoint
    runtime.forkAt("gameplay_stage2");

    state = runtime.getState();
    expect(runtime.getCurrentNodeId()).toBe("gameplay_stage2");
    expect(state.flags.stage2Failed).toBeUndefined();
    expect(state.variables.stage2Deaths).toBeUndefined();
    expect(state.evidence).not.toContain("invader_ship_log");

    // Stage 1 objective completion should still be intact from prior history
    expect(state.objectives.obj_stage1?.completed).toBe(true);
  });

  it("prevents automatic rewind when node policy is marked 'permanent' (permadeath)", () => {
    const runtime = new StoryRuntime(replayStoryGraph);

    runtime.navigateToNode("gameplay_stage1");
    const cp1 = runtime.saveCheckpoint("gameplay_stage1");

    runtime.navigateToNode("permadeath_node");
    expect(runtime.getCurrentNodeId()).toBe("permadeath_node");

    // Attempting rewind from a permanent node should fail (return false)
    const rewindSuccess = runtime.rewind(cp1.nodeId);
    expect(rewindSuccess).toBe(false);
    expect(runtime.getCurrentNodeId()).toBe("permadeath_node");
  });
});
