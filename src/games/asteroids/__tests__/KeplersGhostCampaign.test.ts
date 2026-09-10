import {
  StoryRuntime,
  StoryGraphValidator,
  StorySimulator,
  CampaignSaveManager,
  MetaProgressionService,
  ArcadeOrchestrator,
  ArcadeKernel,
  EventBus,
  MiniGameResult,
  MiniGameEncounterRegistry
} from "@tiny-aster/core";
import { keplersGhostStoryGraph } from "../story/KeplersGhostGraph";
import {
  escapeRoute01Encounter,
  keplerPhase2Encounter,
  keplerPhase3Encounter
} from "../story/KeplerEncounters";
import { ENDING_REWARDS_MAP, applyEndingRewards } from "../../shared/story/EndingRewards";

describe("Kepler's Ghost Campaign Integration Suite", () => {
  let runtime: StoryRuntime;
  let metaService: MetaProgressionService;
  let saveManager: CampaignSaveManager;
  let encounterRegistry: MiniGameEncounterRegistry;
  let orchestrator: ArcadeOrchestrator;
  let eventBus: EventBus;
  let kernel: ArcadeKernel;

  beforeEach(() => {
    eventBus = new EventBus();
    kernel = new ArcadeKernel(eventBus);
    runtime = new StoryRuntime();
    runtime.bindEventBus(eventBus);

    metaService = new MetaProgressionService(undefined, undefined, false);
    saveManager = new CampaignSaveManager();

    encounterRegistry = new MiniGameEncounterRegistry();
    encounterRegistry.register(escapeRoute01Encounter);
    encounterRegistry.register(keplerPhase2Encounter);
    encounterRegistry.register(keplerPhase3Encounter);

    orchestrator = new ArcadeOrchestrator({
      runtime,
      kernel
    });

    runtime.loadGraph(keplersGhostStoryGraph, true);
  });

  it("passes structural validation and random walk simulation with StoryGraphValidator and StorySimulator", () => {
    const validationResult = StoryGraphValidator.validate(keplersGhostStoryGraph, {
      declaredFlags: [
        "escapedDebrisField",
        "escapeShipDamaged",
        "ast_path_attack",
        "ast_path_stealth",
        "ast_path_investigate",
        "quarantineBreached",
        "quarantineFlawless",
        "blackBoxDecrypted",
        "keplerFlawlessRun",
        "coreOvercharged",
        "swarmMerged",
        "ending_flawless_unlocked",
        "ending_pyrrhic_unlocked",
        "ending_lost_unlocked",
        "ending_merged_unlocked",
        "navigationData"
      ],
      declaredVariables: ["oxygen", "reactorPower", "narrativeScore"]
    });

    expect(validationResult.valid).toBe(true);
    expect(validationResult.errors).toHaveLength(0);

    const simulationResult = StorySimulator.exploreStoryGraph(keplersGhostStoryGraph);

    expect(simulationResult.unreachableNodes).toHaveLength(0);
    expect(simulationResult.unmarkedDeadEnds).toHaveLength(0);
  });

  it("navigates the flawless route to ending_kepler_ghost_flawless and unlocks meta modifiers", () => {
    // 1. Intro dialogue -> Phase 1 Cutscene -> Phase 1 Gameplay
    expect(runtime.getCurrentNodeId()).toBe("ast_intro_dialogue");
    eventBus.emit("dialogue:completed", {});
    runtime.evaluateTransitions();
    expect(runtime.getCurrentNodeId()).toBe("ast_gameplay_phase1");

    // Phase 1 gameplay completion
    orchestrator.startRun(escapeRoute01Encounter, runtime.getState(), "ast_gameplay_phase1", 123);
    orchestrator.notifyPlaying();
    const p1Result: MiniGameResult = {
      runId: orchestrator.getActiveContext()!.runId,
      gameId: "asteroids",
      score: 1500,
      completed: true,
      durationMs: 30000,
      metrics: { collisions: 0 },
      secretsFound: []
    };
    orchestrator.submitResult(p1Result);
    runtime.applyEffect({ type: "completeObjective", objectiveId: "obj_ast_phase1" });
    runtime.evaluateTransitions();

    // 2. Choice branch -> Stealth route
    expect(runtime.getCurrentNodeId()).toBe("ast_choice_branch");
    expect(runtime.selectChoice("ast_choice_stealth")).toBe(true);
    runtime.evaluateTransitions();
    expect(runtime.getCurrentNodeId()).toBe("ast_gameplay_phase2");

    // Phase 2 gameplay completion (Flawless + secret)
    orchestrator.startRun(keplerPhase2Encounter, runtime.getState(), "ast_gameplay_phase2", 124);
    orchestrator.notifyPlaying();
    const p2Result: MiniGameResult = {
      runId: orchestrator.getActiveContext()!.runId,
      gameId: "asteroids",
      score: 3000,
      completed: true,
      durationMs: 40000,
      metrics: { collisions: 1 },
      secretsFound: ["black_box_decrypted"]
    };
    orchestrator.submitResult(p2Result);
    runtime.applyEffect({ type: "completeObjective", objectiveId: "obj_ast_phase2" });
    runtime.evaluateTransitions();

    // 3. Phase 2 eval -> Phase 3 Cutscene Decrypted -> Phase 3 Gameplay
    runtime.evaluateTransitions();
    expect(runtime.getCurrentNodeId()).toBe("ast_gameplay_phase3");

    // Phase 3 gameplay completion (Flawless)
    orchestrator.startRun(keplerPhase3Encounter, runtime.getState(), "ast_gameplay_phase3", 125);
    orchestrator.notifyPlaying();
    const p3Result: MiniGameResult = {
      runId: orchestrator.getActiveContext()!.runId,
      gameId: "asteroids",
      score: 6000,
      completed: true,
      durationMs: 50000,
      metrics: { collisions: 2, asteroidsDestroyed: 25 },
      secretsFound: []
    };
    orchestrator.submitResult(p3Result);
    runtime.applyEffect({ type: "completeObjective", objectiveId: "obj_ast_phase3" });
    runtime.evaluateTransitions();

    // 4. Final eval -> ending_kepler_ghost_flawless
    expect(runtime.getCurrentNodeId()).toBe("ending_kepler_ghost_flawless");
    expect(runtime.getCurrentNode()?.isEndNode).toBe(true);

    metaService.recordRunCompletion("ending_kepler_ghost_flawless");
    applyEndingRewards("ending_kepler_ghost_flawless", metaService);

    expect(metaService.getState().completedEndings).toContain("ending_kepler_ghost_flawless");
    for (const reward of ENDING_REWARDS_MAP.ending_kepler_ghost_flawless) {
      expect(metaService.getState().unlockedModifiers).toContain(reward);
    }
  });

  it("navigates the swarm merged route to ending_kepler_ghost_merged", () => {
    // Navigate to Phase 3 gameplay
    runtime.navigateToNode("ast_gameplay_phase3");

    orchestrator.startRun(keplerPhase3Encounter, runtime.getState(), "ast_gameplay_phase3", 999);
    orchestrator.notifyPlaying();
    const p3Result: MiniGameResult = {
      runId: orchestrator.getActiveContext()!.runId,
      gameId: "asteroids",
      score: 5500,
      completed: true,
      durationMs: 60000,
      metrics: { collisions: 9 }, // High collision triggers swarmMerged
      secretsFound: []
    };
    orchestrator.submitResult(p3Result);
    runtime.applyEffect({ type: "completeObjective", objectiveId: "obj_ast_phase3" });
    runtime.evaluateTransitions();

    expect(runtime.getCurrentNodeId()).toBe("ending_kepler_ghost_merged");
    expect(runtime.getFlag("swarmMerged")).toBe(true);
  });

  it("preserves narrative state across roundtrip saveCampaign and loadCampaign with checkpointing", async () => {
    // 1. Advance to Phase 2 gameplay and choice selection
    runtime.navigateToNode("ast_choice_branch");
    runtime.selectChoice("ast_choice_attack");
    runtime.evaluateTransitions();
    expect(runtime.getCurrentNodeId()).toBe("ast_gameplay_phase2");
    expect(runtime.getFlag("ast_path_attack")).toBe(true);

    // 2. Save campaign slot
    const envelope = await saveManager.saveCampaign("slot_kepler_test", runtime, metaService, {
      activeGameId: "asteroids",
      activeGameSeed: 424242
    });
    expect(envelope.narrative.story.currentNodeId).toBe("ast_gameplay_phase2");

    // 3. Instantiate fresh runtime session and restore save
    const restoredRuntime = new StoryRuntime();
    restoredRuntime.loadGraph(keplersGhostStoryGraph, false);
    const restoredMeta = new MetaProgressionService(undefined, undefined, false);

    const loadedEnvelope = await saveManager.loadCampaign("slot_kepler_test", restoredRuntime, restoredMeta);

    expect(loadedEnvelope).not.toBeNull();
    expect(restoredRuntime.getCurrentNodeId()).toBe("ast_gameplay_phase2");
    expect(restoredRuntime.getFlag("ast_path_attack")).toBe(true);
    expect(loadedEnvelope?.activeGameSeed).toBe(424242);
  });
});
