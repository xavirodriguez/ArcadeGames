import {
  ArcadeOrchestrator,
  GameplayEvent,
  MidGameNarrativeDirector,
  MiniGameEncounter,
  MiniGameResult,
  OutcomeRuleEngine,
  StoryEffectApplier,
  StoryGraph,
  StoryRuntime,
  DynamicDifficultyManager,
  MetaProgressionService,
  AssistRule,
  MetaEvidence,
  MiniGameOutcomeRule
} from "../src/story";

describe("Comprehensive Metagame Integration Flow Scenarios", () => {
  let storyGraph: StoryGraph;
  let storyRuntime: StoryRuntime;
  let orchestrator: ArcadeOrchestrator;

  beforeEach(() => {
    storyGraph = {
      id: "test_campaign",
      title: "Test Campaign",
      entryNodeId: "node_start",
      nodes: {
        node_start: {
          id: "node_start",
          type: "dialogue",
          dialogue: {
            id: "d1",
            lines: [{ textKey: "System online" }]
          },
          transitions: [{ targetNodeId: "node_encounter" }]
        },
        node_encounter: {
          id: "node_encounter",
          type: "gameplay",
          meta: { encounterId: "escape_route_01" }
        },
        node_success: {
          id: "node_success",
          type: "dialogue",
          dialogue: { id: "d2", lines: [{ textKey: "Escaped debris field!" }] }
        }
      }
    };

    storyRuntime = new StoryRuntime(storyGraph);
    orchestrator = new ArcadeOrchestrator({ runtime: storyRuntime });
  });

  // Case A: Story node -> Asteroids -> success -> StoryEffect -> story flag -> next node
  it("Case A: executes full lifecycle from story node to minigame win and narrative flag transition", () => {
    const encounter: MiniGameEncounter = {
      id: "escape_route_01",
      gameId: "asteroids",
      outcomeRules: [
        {
          id: "rule_win",
          priority: 10,
          condition: { field: "completed", operator: "==", value: true },
          effects: [
            { type: "setFlag", key: "escapedDebrisField", value: true },
            { type: "navigateToNode", nodeId: "node_success" }
          ]
        }
      ]
    };

    const snapshot = storyRuntime.getState();
    const context = orchestrator.startRun(encounter, snapshot);
    expect(orchestrator.getState()).toBe("loading");

    orchestrator.notifyPlaying();
    expect(orchestrator.getState()).toBe("playing");

    const result: MiniGameResult = {
      runId: context.runId,
      gameId: "asteroids",
      score: 1500,
      completed: true,
      durationMs: 30000,
      metrics: {},
      secretsFound: []
    };

    const effects = orchestrator.submitResult(result);
    expect(effects).not.toBeNull();
    expect(storyRuntime.getState().flags.escapedDebrisField).toBe(true);
    expect(storyRuntime.getCurrentNode()?.id).toBe("node_success");
  });

  // Case B: Asteroids -> success + damage + secret -> 3 rules -> accumulated effects
  it("Case B: evaluates multi-matching outcome rules simultaneously for cumulative effects", () => {
    const ruleEngine = new OutcomeRuleEngine();
    const applier = new StoryEffectApplier();

    const outcomeRules: MiniGameOutcomeRule[] = [
      {
        id: "r1_success",
        priority: 10,
        condition: { field: "completed", operator: "==", value: true },
        effects: [{ type: "setFlag", key: "escapedDebrisField", value: true }]
      },
      {
        id: "r2_damage",
        priority: 20,
        condition: { metric: "collisions", operator: ">=", value: 5 },
        effects: [
          { type: "incrementVariable", key: "oxygen", amount: -25 },
          { type: "setFlag", key: "shipDamaged", value: true }
        ]
      },
      {
        id: "r3_secret",
        priority: 30,
        condition: { secret: "black_box_fragment" },
        effects: [{ type: "discoverEvidence", evidenceId: "black_box_fragment" }]
      }
    ];

    const result: MiniGameResult = {
      runId: "run_b",
      gameId: "asteroids",
      score: 1200,
      completed: true,
      durationMs: 40000,
      metrics: { collisions: 5 },
      secretsFound: ["black_box_fragment"]
    };

    const effects = ruleEngine.evaluate(result, outcomeRules);
    expect(effects.length).toBe(4); // 1 + 2 + 1 = 4 accumulated effects

    applier.applyEffects(storyRuntime, effects);
    const updatedState = storyRuntime.getState();

    expect(updatedState.flags.escapedDebrisField).toBe(true);
    expect(updatedState.flags.shipDamaged).toBe(true);
    expect(updatedState.evidence).toContain("black_box_fragment");
  });

  // Case C: Shield critical -> GameplayEvent -> MidGameNarrativeDirector -> Radio Cue
  it("Case C: dispatches gameplay event to MidGameNarrativeDirector and returns radio cue", () => {
    const director = new MidGameNarrativeDirector([
      {
        id: "rule_critical_radio",
        eventName: "ShieldCritical",
        cue: {
          id: "cue_radio_1",
          type: "radio",
          priority: 10,
          titleKey: "ARES TRANSMISSION",
          rawText: "Warning: Shields failing!",
          durationMs: 3000
        }
      }
    ]);

    const event: GameplayEvent = { id: "e1", name: "ShieldCritical", timestamp: 1000 };
    const cue = director.evaluateEvent(event, storyRuntime.getState());

    expect(cue).not.toBeNull();
    expect(cue?.type).toBe("radio");
    expect(cue?.titleKey).toBe("ARES TRANSMISSION");
  });

  // Case D: 3 failures -> DDA assist offered -> modifier applied -> new run
  it("Case D: offers diegetic DDA assistance after 3 consecutive failures", () => {
    const dda = new DynamicDifficultyManager();
    const assistRule: AssistRule = {
      id: "ares_stabilization",
      encounterId: "escape_route_01",
      minConsecutiveFailures: 3,
      diegeticOfferMessageKey: "Offer stabilization",
      modifier: { id: "m_stabilize", targetProperty: "shieldMultiplier", value: 1.5 }
    };

    dda.recordAttempt("escape_route_01", false);
    dda.recordAttempt("escape_route_01", false);
    expect(dda.shouldOfferAssistance(assistRule)).toBe(false);

    dda.recordAttempt("escape_route_01", false);
    expect(dda.shouldOfferAssistance(assistRule)).toBe(true);
  });

  // Case E: Run completed -> meta evidence unlocked -> New Game+ -> evidence persists
  it("Case E: unlocks meta evidence upon run completion that persists into New Game+", () => {
    const metaService = new MetaProgressionService();

    const metaItem: MetaEvidence = {
      id: "meta_layer_1",
      titleKey: "BLACK BOX LAYER",
      category: "black_box_layer",
      discoveredAtTimestamp: Date.now()
    };

    metaService.discoverMetaEvidence(metaItem);
    metaService.recordRunCompletion("ending_escape");

    expect(metaService.isNewGamePlusUnlocked()).toBe(true);
    expect(metaService.getState().discoveredMetaEvidence.length).toBe(1);
    expect(metaService.getState().discoveredMetaEvidence[0].id).toBe("meta_layer_1");
  });
});
