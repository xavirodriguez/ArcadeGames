import {
  StoryGraph,
  StoryPackage,
  StoryRuntime,
  StoryPackageValidator,
  StoryMigrations,
  StorySimulator,
  DeductionEngine,
  RelationshipEngine,
  NarrativeTimelineEngine,
  NarrativeTelemetryService,
  CYOAPresenter,
  TerminalPresenter,
  VisualNovelPresenter,
  EventBus
} from "../src";

describe("Narrative Engine Architecture Subsystems", () => {
  const sampleGraph: StoryGraph = {
    id: "test_campaign",
    title: "Test Campaign",
    entryNodeId: "node_start",
    nodes: {
      node_start: {
        id: "node_start",
        type: "dialogue",
        title: "Awakening",
        effects: [
          { type: "setFlag", key: "awakened", value: true },
          { type: "setVariable", key: "energy", value: 100 }
        ],
        transitions: [{ targetNodeId: "node_choice_1" }]
      },
      node_choice_1: {
        id: "node_choice_1",
        type: "choice",
        title: "First Decision",
        choices: [
          {
            id: "choice_a",
            titleKey: "Option A",
            targetNodeId: "node_path_a",
            effects: [
              { type: "incrementVariable", key: "energy", amount: -20 },
              { type: "discoverEvidence", evidenceId: "evidence_log_1" }
            ]
          },
          {
            id: "choice_b",
            titleKey: "Option B",
            targetNodeId: "node_path_b",
            effects: [
              { type: "incrementVariable", key: "energy", amount: -50 },
              { type: "setFlag", key: "tookRisk", value: true }
            ]
          }
        ]
      },
      node_path_a: {
        id: "node_path_a",
        type: "dialogue",
        title: "Path A Dialogue",
        transitions: [{ targetNodeId: "node_ending" }]
      },
      node_path_b: {
        id: "node_path_b",
        type: "dialogue",
        title: "Path B Dialogue",
        transitions: [{ targetNodeId: "node_ending" }]
      },
      node_ending: {
        id: "node_ending",
        type: "dialogue",
        title: "Ending Node",
        isEndNode: true
      }
    }
  };

  describe("1. Declarative StoryEffects in StoryRuntime", () => {
    it("should execute entry node effects upon loading and navigation", () => {
      const runtime = new StoryRuntime(sampleGraph);
      const state = runtime.getState();

      expect(state.flags.awakened).toBe(true);
      expect(state.variables.energy).toBe(100);
    });

    it("should execute choice selection declarative effects", () => {
      const runtime = new StoryRuntime(sampleGraph);
      expect(runtime.getCurrentNode()?.id).toBe("node_choice_1");

      const success = runtime.selectChoice("choice_a");
      expect(success).toBe(true);
      expect(runtime.getCurrentNode()?.id).toBe("node_path_a");

      const state = runtime.getState();
      expect(state.variables.energy).toBe(80);
      expect(state.evidence).toContain("evidence_log_1");
      expect(state.flags["evidence:evidence_log_1"]).toBe(true);
    });

    it("should emit events when discoverEvidence and completeObjective effects execute", () => {
      const eventBus = new EventBus();
      const evidenceSpy = jest.fn();
      const objectiveSpy = jest.fn();

      eventBus.on("story:evidence_discovered" as any, evidenceSpy);
      eventBus.on("story:objective_completed" as any, objectiveSpy);

      const runtime = new StoryRuntime();
      runtime.bindEventBus(eventBus);

      runtime.applyEffect({ type: "discoverEvidence", evidenceId: "vault_keycard" });
      expect(evidenceSpy).toHaveBeenCalledWith(
        { evidenceId: "vault_keycard" },
        "story:evidence_discovered"
      );

      runtime.applyEffect({ type: "completeObjective", objectiveId: "restore_reactor" });
      expect(objectiveSpy).toHaveBeenCalledWith(
        expect.objectContaining({ objectiveId: "restore_reactor" }),
        "story:objective_completed"
      );
    });
  });

  describe("2. Versioned StoryPackage & Package Linter", () => {
    const samplePackage: StoryPackage = {
      manifest: {
        id: "test_pkg",
        title: "Test Package",
        contentVersion: "1.0.0",
        schemaVersion: 3,
        entryGraph: "test_campaign"
      },
      graphs: {
        test_campaign: sampleGraph
      },
      evidence: {
        evidence_log_1: {
          id: "evidence_log_1",
          titleKey: "Log #01",
          category: "audio"
        }
      }
    };

    it("should validate package structure and cross-references successfully", () => {
      const result = StoryPackageValidator.validate(samplePackage);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it("should detect missing entry graph and unregistered evidence in package validator", () => {
      const invalidPkg: StoryPackage = {
        ...samplePackage,
        manifest: {
          ...samplePackage.manifest,
          entryGraph: "non_existent_graph"
        }
      };

      const result = StoryPackageValidator.validate(invalidPkg);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Manifest entryGraph 'non_existent_graph' does not exist in package graphs.");
    });

    it("should migrate un-packaged single StoryGraph into versioned StoryPackage schema v3", () => {
      const migrated = StoryMigrations.migrateStoryPackage(sampleGraph);
      expect(migrated.manifest.schemaVersion).toBe(3);
      expect(migrated.manifest.entryGraph).toBe("test_campaign");
      expect(migrated.graphs.test_campaign).toBeDefined();
    });
  });

  describe("3. StorySimulator Automated Replay and Random Exploration", () => {
    it("should perform deterministic replay simulation along specified choice path", () => {
      const result = StorySimulator.simulatePath(sampleGraph, ["choice_a"]);
      expect(result.success).toBe(true);
      expect(result.selectedChoices).toEqual(["choice_a"]);
      expect(result.endingNodeId).toBe("node_ending");
      expect(result.visitedNodes).toContain("node_path_a");
    });

    it("should perform random walk simulation with deterministic seed", () => {
      const result = StorySimulator.simulateRandomWalk({
        graph: sampleGraph,
        seed: 42
      });

      expect(result.visitedNodes.length).toBeGreaterThan(0);
      expect(result.endingNodeId).toBe("node_ending");
    });

    it("should analyze graph reachability and generate narrative coverage metrics", () => {
      const report = StorySimulator.exploreStoryGraph(sampleGraph, [1, 2, 3, 4, 5, 10, 42, 100]);

      expect(report.unreachableNodes).toHaveLength(0);
      expect(report.metrics.nodeCoverage).toBe(1.0);
      expect(report.metrics.visitedNodeCount).toBe(5);
      expect(report.metrics.endingCoverage).toBe(1.0);
    });
  });

  describe("4. DeductionEngine System", () => {
    it("should formulate active deduction when selected evidence matches rule requirements", () => {
      const engine = new DeductionEngine([
        {
          id: "deduce_sabotage",
          requires: ["log_01", "tool_marks"],
          resultEvidenceId: "sabotage_confirmed",
          questionId: "q_accident_or_sabotage"
        }
      ]);

      engine.discoverEvidence("log_01");
      engine.discoverEvidence("tool_marks");

      const result = engine.formulateDeduction(["log_01", "tool_marks"], "q_accident_or_sabotage");
      expect(result.success).toBe(true);
      expect(result.resultEvidenceId).toBe("sabotage_confirmed");
      expect(engine.getDiscoveredEvidence()).toContain("sabotage_confirmed");
    });

    it("should provide framing questions for active deduction UI guidance", () => {
      const engine = new DeductionEngine([
        {
          id: "rule_1",
          requires: ["ev_1", "ev_2"],
          resultEvidenceId: "res_1",
          questionId: "question_what_happened"
        }
      ]);

      engine.discoverEvidence("ev_1");
      const framing = engine.getFramingQuestions();

      expect(framing).toHaveLength(1);
      expect(framing[0].questionId).toBe("question_what_happened");
      expect(framing[0].candidates).toContain("ev_1");
    });
  });

  describe("5. RelationshipEngine System", () => {
    it("should track character memories and multi-dimensional relationship disposition", () => {
      const engine = new RelationshipEngine();

      engine.modifyRelationship("vega", { trust: 3, suspicion: 2, respect: 4 });
      engine.addMemory({
        characterId: "vega",
        type: "assistance",
        referenceId: "power_infirmary"
      });

      const rel = engine.getRelationship("vega");
      expect(rel.trust).toBe(3);
      expect(rel.suspicion).toBe(2);
      expect(rel.respect).toBe(4);

      expect(engine.hasMemory("vega", "assistance", "power_infirmary")).toBe(true);

      const status = engine.getQualitativeStatus("vega");
      expect(status.summary).toContain("Confía parcialmente");
      expect(status.summary).toContain("recelo");
    });

    it("should export and import relationship state snapshots", () => {
      const engine = new RelationshipEngine();
      engine.modifyRelationship("ares", { fear: 6 });
      engine.addMemory({ characterId: "ares", type: "lie", referenceId: "fake_record" });

      const exported = engine.exportState();

      const newEngine = new RelationshipEngine();
      newEngine.importState(exported);

      expect(newEngine.getRelationship("ares").fear).toBe(6);
      expect(newEngine.hasMemory("ares", "lie", "fake_record")).toBe(true);
    });
  });

  describe("6. NarrativeTimelineEngine Causality Graph", () => {
    it("should record narrative events and maintain bi-directional causal dependency graph", () => {
      const timeline = new NarrativeTimelineEngine();

      const e1 = timeline.recordEvent({
        type: "ChoiceSelected",
        title: "Confronted AI"
      });

      const e2 = timeline.recordEvent({
        type: "AccessRestricted",
        title: "AI Restricted Security Access",
        causedBy: [e1.id]
      });

      const causesOfE2 = timeline.getCausesOf(e2.id);
      expect(causesOfE2).toHaveLength(1);
      expect(causesOfE2[0].id).toBe(e1.id);

      const consequencesOfE1 = timeline.getConsequencesOf(e1.id);
      expect(consequencesOfE1).toHaveLength(1);
      expect(consequencesOfE1[0].id).toBe(e2.id);

      expect(timeline.getFormattedTimeline()).toHaveLength(2);
    });
  });

  describe("7. NarrativeTelemetryService Analytics", () => {
    it("should collect privacy-safe telemetry events and compute node visit heatmaps", () => {
      const telemetry = new NarrativeTelemetryService();

      telemetry.logNodeEntered("hub");
      telemetry.logNodeEntered("reactor");
      telemetry.logNodeEntered("hub");

      const heatmap = telemetry.getHeatmap();
      expect(heatmap["hub"]).toBe(2);
      expect(heatmap["reactor"]).toBe(1);
    });

    it("should compute funnel drop-off sequence and decision entropy", () => {
      const telemetry = new NarrativeTelemetryService();

      telemetry.logNodeEntered("start");
      telemetry.logNodeEntered("start");

      telemetry.logChoiceSelected("option_1", "choice_node");
      telemetry.logChoiceSelected("option_2", "choice_node");

      telemetry.logNodeEntered("end");

      const funnel = telemetry.calculateFunnel(["start", "end"]);
      expect(funnel[0].count).toBe(2);
      expect(funnel[1].count).toBe(1);
      expect(funnel[1].conversionRate).toBe(0.5);

      const entropy = telemetry.getDecisionEntropy("choice_node");
      expect(entropy).toBeCloseTo(1.0, 2); // Perfectly balanced binary choice = 1.0 bit
    });
  });

  describe("8. NarrativePresenter Adapters", () => {
    const context = {
      node: sampleGraph.nodes.node_choice_1,
      state: new StoryRuntime(sampleGraph).getState(),
      availableChoices: sampleGraph.nodes.node_choice_1.choices
    };

    it("should build CYOAPresenter model", () => {
      const presenter = new CYOAPresenter();
      const model = presenter.buildViewModel(context);

      expect(model.style).toBe("cyoa");
      expect(model.choices).toHaveLength(2);
      expect(model.choices[0].label).toBe("Option A");
    });

    it("should build TerminalPresenter model", () => {
      const presenter = new TerminalPresenter();
      const model = presenter.buildViewModel(context);

      expect(model.style).toBe("terminal");
      expect(model.body).toContain("> SYSTEM NODE: NODE_CHOICE_1");
      expect(model.choices[0].label).toContain("[1] Option A");
    });

    it("should build VisualNovelPresenter model", () => {
      const presenter = new VisualNovelPresenter();
      const model = presenter.buildViewModel({
        node: {
          id: "dlg_node",
          type: "dialogue",
          dialogue: {
            id: "d1",
            lines: [{ characterId: "ares", speakerName: "ARES", textKey: "System online." }]
          }
        },
        state: context.state
      });

      expect(model.style).toBe("visual_novel");
      expect(model.speaker?.name).toBe("ARES");
      expect(model.body).toBe("System online.");
    });
  });
});
