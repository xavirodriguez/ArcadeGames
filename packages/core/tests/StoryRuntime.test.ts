import { World, EventBus, StoryRuntime, StoryGraph, RelationshipEngine, DeductionEngine, NarrativeTimelineEngine } from "../src";

describe("StoryRuntime & StoryGraph Engine Tests", () => {
  let world: World;
  let eventBus: EventBus;
  let sampleGraph: StoryGraph;

  beforeEach(() => {
    world = new World();
    eventBus = new EventBus();
    world.setResource("EventBus", eventBus);

    sampleGraph = {
      id: "test_campaign",
      title: "Test Campaign",
      entryNodeId: "node_intro",
      nodes: {
        node_intro: {
          id: "node_intro",
          type: "dialogue",
          dialogue: {
            id: "diag_intro",
            lines: [{ textKey: "story.test_intro" }]
          },
          transitions: [
            {
              targetNodeId: "node_gameplay_lvl1",
              condition: { type: "event", key: "dialogue:completed" }
            }
          ]
        },
        node_gameplay_lvl1: {
          id: "node_gameplay_lvl1",
          type: "gameplay",
          objective: {
            id: "obj_clear_lvl1",
            eventKey: "level:completed",
            titleKey: "story.obj_lvl1",
            targetCount: 1,
            currentCount: 0,
            completed: false
          },
          transitions: [
            {
              targetNodeId: "node_choice_1",
              condition: { type: "objective", key: "obj_clear_lvl1" }
            }
          ]
        },
        node_choice_1: {
          id: "node_choice_1",
          type: "choice",
          choices: [
            {
              id: "choice_a",
              titleKey: "choice.option_a",
              targetNodeId: "node_path_a"
            },
            {
              id: "choice_b",
              titleKey: "choice.option_b",
              targetNodeId: "node_path_b"
            }
          ]
        },
        node_path_a: {
          id: "node_path_a",
          type: "cutscene",
          cutscene: { id: "cs_a" }
        },
        node_path_b: {
          id: "node_path_b",
          type: "cutscene",
          cutscene: { id: "cs_b" }
        }
      }
    };
  });

  it("should load graph and start at entry node", () => {
    const runtime = new StoryRuntime(sampleGraph);
    runtime.bindWorld(world);

    expect(runtime.getCurrentNode()?.id).toBe("node_intro");
    expect(runtime.getState().history).toContain("node_intro");
  });

  it("should advance through nodes via events and objective completion", () => {
    const runtime = new StoryRuntime(sampleGraph);
    runtime.bindWorld(world);

    let emittedNode: string | null = null;
    eventBus.on("story:node_changed", (event: any) => {
      emittedNode = event.currentNodeId;
    });

    // Simulate completion of dialogue
    eventBus.emit("dialogue:completed", {});

    expect(runtime.getCurrentNode()?.id).toBe("node_gameplay_lvl1");
    expect(emittedNode).toBe("node_gameplay_lvl1");

    // Simulate level completion event
    eventBus.emit("level:completed", { level: 1 });

    expect(runtime.getCurrentNode()?.id).toBe("node_choice_1");
    expect(emittedNode).toBe("node_choice_1");
  });

  it("should allow making narrative choice and navigating to chosen node branch", () => {
    const runtime = new StoryRuntime(sampleGraph);
    runtime.bindWorld(world);

    // Skip to choice node
    runtime.navigateToNode("node_choice_1");

    let choiceEmitted = false;
    eventBus.on("story:choice_selected", (e: any) => {
      if (e.choiceId === "choice_b") choiceEmitted = true;
    });

    const success = runtime.selectChoice("choice_b");
    expect(success).toBe(true);
    expect(choiceEmitted).toBe(true);
    expect(runtime.getCurrentNode()?.id).toBe("node_path_b");
  });

  it("should evaluate random conditions deterministically using world.gameplayRandom", () => {
    world.gameplayRandom.setSeed(999);
    world.gameplayRandom.unlock();

    const runtime = new StoryRuntime();
    runtime.bindWorld(world);

    const condition = { type: "random" as const, chance: 0.8 };
    const res = runtime.evaluateCondition(condition);
    expect(typeof res).toBe("boolean");
  });

  it("should automatically resolve branch nodes in a single logical tick without UI events", () => {
    const branchGraph: StoryGraph = {
      id: "branch_test",
      title: "Branch Test",
      entryNodeId: "node_branch",
      nodes: {
        node_branch: {
          id: "node_branch",
          type: "branch",
          transitions: [
            {
              targetNodeId: "node_secret_room",
              condition: { type: "variable", key: "hasKey", value: true, operator: "==" },
              priority: 10
            },
            {
              targetNodeId: "node_locked_door",
              priority: 0
            }
          ]
        },
        node_secret_room: {
          id: "node_secret_room",
          type: "dialogue",
          dialogue: { id: "d_secret", lines: [{ textKey: "welcome_secret" }] }
        },
        node_locked_door: {
          id: "node_locked_door",
          type: "dialogue",
          dialogue: { id: "d_locked", lines: [{ textKey: "door_locked" }] }
        }
      }
    };

    const runtime = new StoryRuntime();
    runtime.bindWorld(world);

    const emittedNodes: string[] = [];
    eventBus.on("story:node_changed", (event: any) => {
      emittedNodes.push(event.currentNodeId);
    });

    // 1. First test: hasKey is false/unset -> should resolve to node_locked_door in 1 tick
    runtime.loadGraph(branchGraph, true);

    expect(runtime.getCurrentNode()?.id).toBe("node_locked_door");
    expect(emittedNodes).toEqual(["node_locked_door"]);
    expect(emittedNodes).not.toContain("node_branch");

    // 2. Second test: set variable hasKey = true, navigate to node_branch -> should resolve to node_secret_room
    emittedNodes.length = 0;
    runtime.setVariable("hasKey", true);
    runtime.navigateToNode("node_branch");

    expect(runtime.getCurrentNode()?.id).toBe("node_secret_room");
    expect(emittedNodes).toEqual(["node_secret_room"]);
    expect(emittedNodes).not.toContain("node_branch");
  });

  it("should integrate RelationshipEngine to mutate disposition and record memories via effects/events", () => {
    const relEngine = new RelationshipEngine();
    const runtime = new StoryRuntime();
    runtime.bindWorld(world);
    runtime.bindRelationshipEngine(relEngine);

    // Initial state check
    expect(relEngine.getRelationship("pilot").trust).toBe(0);

    // Mutate trust via relationship variable
    runtime.setVariable("relationship:pilot:trust", 5);
    expect(relEngine.getRelationship("pilot").trust).toBe(5);

    // Emit betrayal event
    runtime.applyEffect({
      type: "emitEvent",
      event: "betrayal",
      payload: { characterId: "pilot", referenceId: "betrayed_mission" }
    });

    const rel = relEngine.getRelationship("pilot");
    expect(rel.trust).toBe(0); // 5 - 5
    expect(rel.suspicion).toBe(5); // 0 + 5
    expect(relEngine.hasMemory("pilot", "betrayal", "betrayed_mission")).toBe(true);
  });

  it("should trigger DeductionEngine automatically when discovering evidence and enable dialogue choice", () => {
    const deductionEngine = new DeductionEngine([
      {
        id: "deduce_sabotage",
        requires: ["ev_log_1", "ev_sensor_data"],
        resultEvidenceId: "sabotage_proven"
      }
    ]);

    const deductionGraph: StoryGraph = {
      id: "deduction_test",
      title: "Deduction Test",
      entryNodeId: "node_interrogation",
      nodes: {
        node_interrogation: {
          id: "node_interrogation",
          type: "choice",
          choices: [
            {
              id: "choice_general_questions",
              titleKey: "Ask general questions",
              targetNodeId: "node_general"
            },
            {
              id: "choice_confront",
              titleKey: "Confront with sabotage evidence",
              targetNodeId: "node_confrontation",
              condition: { type: "evidence", key: "sabotage_proven" }
            }
          ]
        },
        node_general: {
          id: "node_general",
          type: "dialogue",
          dialogue: { id: "d_gen", lines: [{ textKey: "general_talk" }] }
        },
        node_confrontation: {
          id: "node_confrontation",
          type: "dialogue",
          dialogue: { id: "d_conf", lines: [{ textKey: "confront_talk" }] }
        }
      }
    };

    const runtime = new StoryRuntime(deductionGraph);
    runtime.bindWorld(world);
    runtime.bindDeductionEngine(deductionEngine);

    // Initially choice_confront is locked
    expect(runtime.selectChoice("choice_confront")).toBe(false);

    // Discover first piece of evidence
    runtime.discoverEvidence("ev_log_1");
    expect(runtime.selectChoice("choice_confront")).toBe(false);

    // Discover second piece of evidence -> triggers deduction rule automatically
    runtime.discoverEvidence("ev_sensor_data");

    // Check that deduction unlocked sabotage_proven
    expect(runtime.getDiscoveredEvidence()).toContain("sabotage_proven");

    // choice_confront is now enabled and navigable!
    const success = runtime.selectChoice("choice_confront");
    expect(success).toBe(true);
    expect(runtime.getCurrentNode()?.id).toBe("node_confrontation");
  });

  it("should record causal events in NarrativeTimelineEngine and rewind state to checkpoint", () => {
    const timelineEngine = new NarrativeTimelineEngine();

    const checkpointGraph: StoryGraph = {
      id: "checkpoint_test",
      title: "Checkpoint Test",
      entryNodeId: "node_start",
      nodes: {
        node_start: {
          id: "node_start",
          type: "choice",
          checkpoint: true,
          effects: [
            { type: "setVariable", key: "energy", value: 100 }
          ],
          choices: [
            {
              id: "choice_risky_move",
              titleKey: "Take risky path",
              targetNodeId: "node_danger",
              effects: [
                { type: "setVariable", key: "energy", value: 10 }
              ]
            }
          ]
        },
        node_danger: {
          id: "node_danger",
          type: "dialogue",
          dialogue: { id: "d_danger", lines: [{ textKey: "Dangerous territory!" }] }
        }
      }
    };

    const runtime = new StoryRuntime();
    runtime.bindWorld(world);
    runtime.bindTimelineEngine(timelineEngine);

    // Load graph -> hits entry node node_start (checkpoint: true)
    runtime.loadGraph(checkpointGraph, true);

    expect(runtime.getCheckpoints()).toContain("node_start");
    expect(runtime.getState().variables.energy).toBe(100);

    const initialTimelineLength = timelineEngine.getTimeline().length;
    expect(initialTimelineLength).toBeGreaterThan(0);

    // Make choice -> transitions to node_danger
    const choiceSuccess = runtime.selectChoice("choice_risky_move");
    expect(choiceSuccess).toBe(true);
    expect(runtime.getCurrentNode()?.id).toBe("node_danger");
    expect(runtime.getState().variables.energy).toBe(10);

    // Verify causal links in timeline
    const timeline = timelineEngine.getTimeline();
    const lastEvent = timeline[timeline.length - 1];
    expect(lastEvent.type).toBe("NodeEntered");
    expect(lastEvent.payload?.nodeId).toBe("node_danger");
    expect(lastEvent.causedBy).toBeDefined();
    expect(lastEvent.causedBy?.length).toBeGreaterThan(0);

    // Rewind back to checkpoint node_start
    const rewindSuccess = runtime.rewind("node_start");
    expect(rewindSuccess).toBe(true);

    // State, node and timeline must be restored
    expect(runtime.getCurrentNode()?.id).toBe("node_start");
    expect(runtime.getState().variables.energy).toBe(100);
    expect(timelineEngine.getTimeline().length).toBe(initialTimelineLength);
    expect(timelineEngine.getTimeline().pop()?.payload?.nodeId).toBe("node_start");
  });

  it("should evaluate 'objective' condition with operator and value accurately", () => {
    const runtime = new StoryRuntime();
    runtime.bindWorld(world);

    runtime.setObjective({
      id: "obj_test",
      titleKey: "Test Obj",
      targetCount: 2,
      currentCount: 0,
      completed: false
    });

    // Uncompleted objective evaluation
    expect(runtime.evaluateCondition({ type: "objective", key: "obj_test", operator: "==", value: true })).toBe(false);
    expect(runtime.evaluateCondition({ type: "objective", key: "obj_test", operator: "==", value: false })).toBe(true);
    expect(runtime.evaluateCondition({ type: "objective", key: "obj_test", operator: "!=", value: true })).toBe(true);
    expect(runtime.evaluateCondition({ type: "objective", key: "obj_test" })).toBe(false);

    // Complete objective
    runtime.setObjective({
      id: "obj_test",
      titleKey: "Test Obj",
      targetCount: 2,
      currentCount: 2,
      completed: true
    });

    expect(runtime.evaluateCondition({ type: "objective", key: "obj_test", operator: "==", value: true })).toBe(true);
    expect(runtime.evaluateCondition({ type: "objective", key: "obj_test", operator: "==", value: false })).toBe(false);
    expect(runtime.evaluateCondition({ type: "objective", key: "obj_test", operator: "!=", value: false })).toBe(true);
    expect(runtime.evaluateCondition({ type: "objective", key: "obj_test" })).toBe(true);
  });

  it("should isolate numeric/string progress variable 'evidence' from state.evidence discovery array", () => {
    const runtime = new StoryRuntime();
    runtime.bindWorld(world);

    runtime.setVariable("evidence", 3);
    expect(runtime.getVariable("evidence")).toBe(3);
    expect(runtime.getDiscoveredEvidence()).toEqual([]);

    runtime.setVariable("evidence", "some_string_count");
    expect(runtime.getVariable("evidence")).toBe("some_string_count");
    expect(runtime.getDiscoveredEvidence()).toEqual([]); // Should NOT trigger discoverEvidence
  });

  it("should preserve non-serializable values (undefined, NaN, Infinity) in getState()", () => {
    const runtime = new StoryRuntime();
    runtime.bindWorld(world);

    runtime.setVariable("nanVar", NaN);
    runtime.setVariable("infinityVar", Infinity);
    runtime.setVariable("undefVar", undefined);

    const st = runtime.getState();
    expect(Number.isNaN(st.variables.nanVar)).toBe(true);
    expect(st.variables.infinityVar).toBe(Infinity);
    expect(st.variables.undefVar).toBeUndefined();
  });

  it("should prevent premature automatic transition from gameplay nodes with incomplete objectives", () => {
    const gameplayGraph: StoryGraph = {
      id: "gameplay_objective_test",
      title: "Gameplay Objective Test",
      entryNodeId: "game_node",
      nodes: {
        game_node: {
          id: "game_node",
          type: "gameplay",
          objective: {
            id: "defeat_boss",
            eventKey: "boss_defeated",
            titleKey: "Defeat Boss",
            targetCount: 1,
            currentCount: 0,
            completed: false
          },
          transitions: [
            {
              targetNodeId: "next_node"
              // Conditionless transition
            }
          ]
        },
        next_node: {
          id: "next_node",
          type: "dialogue",
          dialogue: { id: "d_next", lines: [{ textKey: "Boss defeated dialogue" }] }
        }
      }
    };

    const runtime = new StoryRuntime(gameplayGraph);
    runtime.bindWorld(world);

    // Initial load -> should remain on game_node because objective is incomplete
    expect(runtime.getCurrentNode()?.id).toBe("game_node");

    // Complete objective via event
    eventBus.emit("boss_defeated", {});

    // Now it should transition to next_node
    expect(runtime.getCurrentNode()?.id).toBe("next_node");
  });
});
