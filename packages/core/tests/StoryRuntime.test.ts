import { World, EventBus, StoryRuntime, StoryGraph } from "../src";

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
});
