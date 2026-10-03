import {
  ArcadeOrchestrator,
  StoryRuntime,
  MiniGameResult,
  MiniGameRunContext
} from "@tiny-aster/core";
import { MultiGameStoryProofOfConcept } from "../MultiGameStoryProofOfConcept";
import {
  asteroidsPOCEncounter,
  spaceInvadersPOCEncounter,
  asteroidsReduxPOCEncounter
} from "../StoryEncounters";

describe("MultiGameStoryProofOfConcept 7-Stage Pipeline Integration Test", () => {
  it("executes the 7-stage narrative <-> minigame pipeline across Asteroids, Space Invaders choice, and Redux to completion", () => {
    const poc = new MultiGameStoryProofOfConcept();

    // Stage 1 & 2: Start Campaign & Navigate through intro to Act 1 Gameplay
    poc.startCampaign();
    expect(poc.storyRuntime.getCurrentNodeId()).toBe("start_node");

    poc.storyRuntime.evaluateTransitions();
    expect(poc.storyRuntime.getCurrentNodeId()).toBe("act1_asteroids_intro");

    poc.storyRuntime.evaluateTransitions();
    expect(poc.storyRuntime.getCurrentNodeId()).toBe("act1_asteroids_gameplay");

    // Stage 3: startCurrentNodeGameplay -> ArcadeOrchestrator.startRun & MiniGameModifierResolver
    const asteroidsRunContext = poc.startCurrentNodeGameplay();
    expect(asteroidsRunContext).not.toBeNull();
    expect(asteroidsRunContext?.gameId).toBe("asteroids");
    expect(typeof asteroidsRunContext?.seed).toBe("number");
    expect(asteroidsRunContext?.encounterId).toBe("poc-asteroids-1");
    expect(asteroidsRunContext?.runId).toBeDefined();

    // Stage 4 & 5: Simulate MiniGameResult execution and submission with metrics
    const asteroidsResult: MiniGameResult = {
      runId: asteroidsRunContext!.runId,
      gameId: "asteroids",
      score: 1500,
      completed: true,
      durationMs: 45000,
      metrics: { wavesCleared: 3, livesRemaining: 2 },
      secretsFound: ["black_box_alpha"]
    };

    // Stage 6 & 7: Submit result, evaluate outcome rules via OutcomeRuleEngine, apply effects via StoryEffectApplier, and advance narrative
    poc.submitGameplayResult(asteroidsResult);

    const stateAfterAct1 = poc.storyRuntime.getState();
    expect(stateAfterAct1.flags.asteroidsPerfect).toBe(true);
    expect(stateAfterAct1.flags.heroicEntry).toBe(true);
    expect(stateAfterAct1.variables.asteroidLevelReached).toBe(2);
    expect(stateAfterAct1.evidence).toContain("black_box_alpha");
    expect(poc.metaService.getState().miniGameMastery["asteroids"]).toBe(1);

    // Transition should have auto-advanced to narrative_bridge_choice
    expect(poc.storyRuntime.getCurrentNodeId()).toBe("narrative_bridge_choice");

    // Select explicit choice: Space Invaders
    poc.storyRuntime.selectChoice("choice_space_invaders");
    expect(poc.storyRuntime.getFlag("route_space_invaders")).toBe(true);
    expect(poc.storyRuntime.getCurrentNodeId()).toBe("act2_spaceinvaders_intro");

    // Advance cutscene transition to Act 2 Space Invaders Gameplay
    poc.storyRuntime.evaluateTransitions();
    expect(poc.storyRuntime.getCurrentNodeId()).toBe("act2_spaceinvaders_gameplay");

    // Repeat 7-stage pipeline for Space Invaders Act 2
    const spaceInvadersRunContext = poc.startCurrentNodeGameplay();
    expect(spaceInvadersRunContext).not.toBeNull();
    expect(spaceInvadersRunContext?.gameId).toBe("space-invaders");
    expect(typeof spaceInvadersRunContext?.seed).toBe("number");
    expect(spaceInvadersRunContext?.encounterId).toBe("poc-space-invaders-1");

    // Heroic entry flag was true, so modifier rules for Space Invaders should reflect no extra lives
    const extraLivesMod = spaceInvadersRunContext?.modifiers.find(
      (m) => m.targetProperty === "extraLives"
    );
    expect(extraLivesMod).toBeDefined();
    expect(extraLivesMod?.value).toBe(0);

    const spaceInvadersResult: MiniGameResult = {
      runId: spaceInvadersRunContext!.runId,
      gameId: "space-invaders",
      score: 6000,
      completed: true,
      durationMs: 60000,
      metrics: { wavesCleared: 2, livesRemaining: 1 },
      secretsFound: ["invader_core_data"]
    };

    poc.submitGameplayResult(spaceInvadersResult);

    const stateAfterAct2 = poc.storyRuntime.getState();
    expect(stateAfterAct2.flags.reinforcementsReceived).toBe(true);
    expect(stateAfterAct2.variables.spaceinvadersScore).toBe(6000);
    expect(stateAfterAct2.evidence).toContain("invader_core_data");
    expect(poc.metaService.getState().miniGameMastery["space-invaders"]).toBe(1);

    // Advanced through branch to act3_asteroids_redux_intro
    expect(poc.storyRuntime.getCurrentNodeId()).toBe("act3_asteroids_redux_intro");

    // Advance to Act 3 Asteroids Redux gameplay
    poc.storyRuntime.evaluateTransitions();
    expect(poc.storyRuntime.getCurrentNodeId()).toBe("act3_asteroids_redux_gameplay");

    const reduxRunContext = poc.startCurrentNodeGameplay();
    expect(reduxRunContext).not.toBeNull();
    expect(reduxRunContext?.gameId).toBe("asteroids");

    // Reinforcements was received (true), shield multiplier modifier should be 1.5
    const shieldMod = reduxRunContext?.modifiers.find(
      (m) => m.targetProperty === "shieldMultiplier"
    );
    expect(shieldMod).toBeDefined();
    expect(shieldMod?.value).toBe(1.5);

    const reduxResult: MiniGameResult = {
      runId: reduxRunContext!.runId,
      gameId: "asteroids",
      score: 3500,
      completed: true,
      durationMs: 50000,
      metrics: { wavesCleared: 4 },
      secretsFound: []
    };

    poc.submitGameplayResult(reduxResult);

    // Final branch evaluation should yield Flawless Victory
    expect(poc.storyRuntime.getCurrentNodeId()).toBe("ending_flawless");
    const endNode = poc.storyRuntime.getCurrentNode();
    expect(endNode?.isEndNode).toBe(true);

    // Verify Metaprogression updated run completion and unlocked permanent modifiers
    expect(poc.metaService.getState().completedRuns).toBe(1);
    expect(poc.metaService.getState().completedEndings).toContain("ending_flawless");
    expect(poc.metaService.getState().unlockedModifiers).toContain("hyper_drift");
    expect(poc.metaService.getState().unlockedModifiers).toContain("shield_pulse");
  });

  it("evaluates rules and routes transitions correctly on loss (completed: false) vs win (completed: true)", () => {
    // 1. Loss scenario: player fails minigame
    const pocLoss = new MultiGameStoryProofOfConcept();
    pocLoss.startCampaign();
    pocLoss.storyRuntime.evaluateTransitions(); // intro
    pocLoss.storyRuntime.evaluateTransitions(); // gameplay
    expect(pocLoss.storyRuntime.getCurrentNodeId()).toBe("act1_asteroids_gameplay");

    const lossRunContext = pocLoss.startCurrentNodeGameplay();
    expect(lossRunContext).not.toBeNull();

    const lossResult: MiniGameResult = {
      runId: lossRunContext!.runId,
      gameId: "asteroids",
      score: 200,
      completed: false, // PLAYER LOST
      durationMs: 15000,
      metrics: { wavesCleared: 0, livesRemaining: 0 },
      secretsFound: []
    };

    pocLoss.submitGameplayResult(lossResult);

    // Objective must NOT be marked complete when completed is false
    const act1Obj = pocLoss.storyRuntime.getObjective("survive-asteroids-wave3");
    expect(act1Obj?.completed).toBe(false);

    // Outcome rule for struggle should have set heroicEntry = false
    expect(pocLoss.storyRuntime.getFlag("heroicEntry")).toBe(false);

    // Transition history confirms branch_struggling_entry was executed
    expect(pocLoss.storyRuntime.getState().history).toContain("branch_struggling_entry");
    expect(pocLoss.storyRuntime.getCurrentNodeId()).toBe("narrative_bridge_choice");

    // 2. Win scenario: player completes minigame
    const pocWin = new MultiGameStoryProofOfConcept();
    pocWin.startCampaign();
    pocWin.storyRuntime.evaluateTransitions(); // intro
    pocWin.storyRuntime.evaluateTransitions(); // gameplay
    expect(pocWin.storyRuntime.getCurrentNodeId()).toBe("act1_asteroids_gameplay");

    const winRunContext = pocWin.startCurrentNodeGameplay();
    const winResult: MiniGameResult = {
      runId: winRunContext!.runId,
      gameId: "asteroids",
      score: 2000,
      completed: true, // PLAYER WON
      durationMs: 30000,
      metrics: { wavesCleared: 3, livesRemaining: 2 },
      secretsFound: []
    };

    pocWin.submitGameplayResult(winResult);

    // Objective MUST be marked complete when completed is true
    const winObj = pocWin.storyRuntime.getObjective("survive-asteroids-wave3");
    expect(winObj?.completed).toBe(true);

    // Heroic entry flag set to true and history contains branch_heroic_entry
    expect(pocWin.storyRuntime.getFlag("heroicEntry")).toBe(true);
    expect(pocWin.storyRuntime.getState().history).toContain("branch_heroic_entry");
    expect(pocWin.storyRuntime.getCurrentNodeId()).toBe("narrative_bridge_choice");
  });

  it("handles checkpoint restoration and retrying after minigame failure", () => {
    const poc = new MultiGameStoryProofOfConcept();
    poc.startCampaign();
    poc.storyRuntime.evaluateTransitions(); // intro
    poc.storyRuntime.evaluateTransitions(); // gameplay
    expect(poc.storyRuntime.getCurrentNodeId()).toBe("act1_asteroids_gameplay");

    const initialNode = poc.storyRuntime.getCurrentNode();
    expect(initialNode?.checkpoint).toBe(true);

    // Simulate failure without advancing node if player decides to retry at checkpoint
    const checkpointId = initialNode?.id;
    expect(checkpointId).toBe("act1_asteroids_gameplay");

    // Perform fork/restore at checkpoint
    poc.storyRuntime.forkAt(checkpointId!);
    expect(poc.storyRuntime.getCurrentNodeId()).toBe("act1_asteroids_gameplay");

    // Retry minigame run
    const retryRunContext = poc.startCurrentNodeGameplay();
    expect(retryRunContext).not.toBeNull();

    const retryResult: MiniGameResult = {
      runId: retryRunContext!.runId,
      gameId: "asteroids",
      score: 1800,
      completed: true,
      durationMs: 35000,
      metrics: { wavesCleared: 3, livesRemaining: 1 },
      secretsFound: []
    };

    poc.submitGameplayResult(retryResult);
    expect(poc.storyRuntime.getObjective("survive-asteroids-wave3")?.completed).toBe(true);
    expect(poc.storyRuntime.getFlag("heroicEntry")).toBe(true);
    expect(poc.storyRuntime.getState().history).toContain("branch_heroic_entry");
  });

  it("directly tests ArcadeOrchestrator modifier resolution using runtime.getState() snapshot", () => {
    const runtime = new StoryRuntime();
    const orchestrator = new ArcadeOrchestrator({ runtime });

    // 1. Initial snapshot with heroicEntry = false
    runtime.setFlag("heroicEntry", false);
    const snapshot1 = runtime.getState();

    const context1: MiniGameRunContext = orchestrator.startRun(
      spaceInvadersPOCEncounter,
      snapshot1,
      "test_node_1",
      424242
    );

    expect(context1.seed).toBe(424242);
    expect(context1.runId).toBeDefined();
    const extraLivesMod1 = context1.modifiers.find(
      (m) => m.targetProperty === "extraLives"
    );
    expect(extraLivesMod1?.value).toBe(2);

    const fireRateMod1 = context1.modifiers.find(
      (m) => m.targetProperty === "fireRateMultiplier"
    );
    expect(fireRateMod1?.value).toBe(1.3);

    orchestrator.notifyPlaying();
    const dummyResult1: MiniGameResult = {
      runId: context1.runId,
      gameId: "space-invaders",
      score: 100,
      completed: true,
      durationMs: 1000,
      metrics: {},
      secretsFound: []
    };
    orchestrator.submitResult(dummyResult1);

    // 2. Snapshot with heroicEntry = true
    runtime.setFlag("heroicEntry", true);
    const snapshot2 = runtime.getState();

    const context2: MiniGameRunContext = orchestrator.startRun(
      spaceInvadersPOCEncounter,
      snapshot2,
      "test_node_2",
      999999
    );

    expect(context2.seed).toBe(999999);
    const extraLivesMod2 = context2.modifiers.find(
      (m) => m.targetProperty === "extraLives"
    );
    expect(extraLivesMod2?.value).toBe(0);
  });
});
