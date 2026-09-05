import {
  StoryNodeBuilder,
  StoryGraphBuilder,
  StoryGraphBuildError,
  cond,
  StoryNode,
  StoryGraph,
  DialogueNodeBuilder,
  ChoiceNodeBuilder,
  CutsceneNodeBuilder,
  GameplayNodeBuilder
} from "../index";

describe("StoryBuilders and StoryConditionHelpers", () => {
  describe("1. Structural compatibility test", () => {
    it("should produce a plain StoryNode equal to a hand-written literal", () => {
      const builtNode = StoryNodeBuilder.node("node_1")
        .asDialogue()
        .setTitle("Test Dialogue")
        .setSceneToLoad("intro_scene")
        .addEffect({ type: "setFlag", key: "introDone", value: true })
        .setDialogue({
          id: "dlg_1",
          lines: [{ speakerName: "AI", textKey: "Hello world" }]
        })
        .addTransition("node_2")
        .build();

      const expectedNode: StoryNode = {
        id: "node_1",
        type: "dialogue",
        title: "Test Dialogue",
        sceneToLoad: "intro_scene",
        effects: [{ type: "setFlag", key: "introDone", value: true }],
        dialogue: {
          id: "dlg_1",
          lines: [{ speakerName: "AI", textKey: "Hello world" }]
        },
        transitions: [{ targetNodeId: "node_2" }]
      };

      expect(builtNode).toEqual(expectedNode);
    });
  });

  describe("2. Terminal types restriction compile-time test", () => {
    it("verifies type-level restrictions on specialized node builders", () => {
      const dialogueBuilder: DialogueNodeBuilder = StoryNodeBuilder.node("d1").asDialogue();
      const checkChoice = (builder: ChoiceNodeBuilder) => builder;
      // @ts-expect-error asChoice/ChoiceNodeBuilder methods should not exist on DialogueNodeBuilder
      checkChoice(dialogueBuilder);

      const choiceBuilder: ChoiceNodeBuilder = StoryNodeBuilder.node("c1").asChoice();
      const checkCutscene = (builder: CutsceneNodeBuilder) => builder;
      // @ts-expect-error asCutscene/CutsceneNodeBuilder methods should not exist on ChoiceNodeBuilder
      checkCutscene(choiceBuilder);

      const cutsceneBuilder: CutsceneNodeBuilder = StoryNodeBuilder.node("cs1").asCutscene();
      const checkGameplay = (builder: GameplayNodeBuilder) => builder;
      // @ts-expect-error asGameplay/GameplayNodeBuilder methods should not exist on CutsceneNodeBuilder
      checkGameplay(cutsceneBuilder);

      // Ensure builders still build properly
      const d2 = StoryNodeBuilder.node("d2").asDialogue().addDialogueLine({ textKey: "hi" });
      expect(d2.build().type).toBe("dialogue");
    });
  });

  describe("3. Validation delegation test", () => {
    it("throws StoryGraphBuildError with broken_transition error for non-existent target node", () => {
      const builder = StoryGraphBuilder.graph("g1", "Test Graph", "n1")
        .addNode(
          StoryNodeBuilder.node("n1")
            .asDialogue()
            .addDialogueLine({ textKey: "Start" })
            .addTransition("non_existent_node")
        );

      expect(() => builder.build()).toThrow(StoryGraphBuildError);

      try {
        builder.build();
      } catch (err) {
        expect(err).toBeInstanceOf(StoryGraphBuildError);
        const buildErr = err as StoryGraphBuildError;
        expect(buildErr.errors.some((e) => e.type === "broken_transition")).toBe(true);
      }
    });

    it("throws StoryGraphBuildError in strict mode for orphan_node or dead_end warnings", () => {
      const builder = StoryGraphBuilder.graph("g_strict", "Strict Graph", "n1")
        .addNode(
          StoryNodeBuilder.node("n1")
            .asDialogue()
            .addDialogueLine({ textKey: "Start" })
            .addTransition("n2")
        )
        .addNode(
          StoryNodeBuilder.node("n2")
            .asDialogue()
            .addDialogueLine({ textKey: "End" })
            .setIsEndNode(true)
        )
        .addNode(
          StoryNodeBuilder.node("orphan1")
            .asDialogue()
            .addDialogueLine({ textKey: "Orphan" })
            .setIsEndNode(true)
        );

      // Non-strict build passes (warnings only)
      expect(() => builder.build()).not.toThrow();

      // Strict build throws due to warnings
      expect(() => builder.build(undefined, { strict: true })).toThrow(StoryGraphBuildError);

      try {
        builder.build(undefined, { strict: true });
      } catch (err) {
        const buildErr = err as StoryGraphBuildError;
        expect(buildErr.warnings.some((w) => w.type === "orphan_node")).toBe(true);
      }
    });
  });

  describe("4. Forward references test", () => {
    it("allows nodes to be registered in any order with forward references without failing before build()", () => {
      const builder = StoryGraphBuilder.graph("g_fwd", "Forward Ref Graph", "node_a");

      // node_a references node_b which is not added yet
      const nodeA = StoryNodeBuilder.node("node_a")
        .asDialogue()
        .addDialogueLine({ textKey: "Line A" })
        .addTransition("node_b");

      expect(() => builder.addNode(nodeA)).not.toThrow();

      // Now add node_b
      const nodeB = StoryNodeBuilder.node("node_b")
        .asDialogue()
        .addDialogueLine({ textKey: "Line B" })
        .setIsEndNode(true);

      expect(() => builder.addNode(nodeB)).not.toThrow();

      // build succeeds now
      let graph: StoryGraph | undefined;
      expect(() => {
        graph = builder.build();
      }).not.toThrow();

      expect(graph?.nodes["node_a"]).toBeDefined();
      expect(graph?.nodes["node_b"]).toBeDefined();
    });
  });

  describe("5. Choice requirement check", () => {
    it("throws a simple Error if .asChoice().build() is called without choices", () => {
      const choiceBuilder = StoryNodeBuilder.node("choice_empty").asChoice();
      expect(() => choiceBuilder.build()).toThrow(Error);
      expect(() => choiceBuilder.build()).toThrow("must have at least one choice option");
    });
  });

  describe("6. Helper cond.event() test", () => {
    it("produces { type: 'event', key: '...' } and not flag event prefix", () => {
      const condition = cond.event("dialogue:completed");
      expect(condition).toEqual({
        type: "event",
        key: "dialogue:completed"
      });
      expect(condition.type).toBe("event");
      expect(condition.key).toBe("dialogue:completed");
    });
  });
});
