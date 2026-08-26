import { MultiGameStoryProofOfConcept } from "../MultiGameStoryProofOfConcept";
import { MiniGameResult } from "@tiny-aster/core";

describe("MultiGameStoryProofOfConcept E2E Campaign Suite", () => {
  it("Scenario 1: Executes Flawless Victory Run (Heroic Entry + Reinforcements Received)", () => {
    const poc = new MultiGameStoryProofOfConcept();
    poc.startCampaign();

    // Act 1: Start at intro -> advance to Act 1 Asteroids gameplay
    expect(poc.storyRuntime.getCurrentNodeId()).toBe("start_node");
    poc.storyRuntime.evaluateTransitions(); // act1_asteroids_intro
    poc.storyRuntime.evaluateTransitions(); // act1_asteroids_gameplay

    expect(poc.storyRuntime.getCurrentNodeId()).toBe("act1_asteroids_gameplay");

    // Launch Act 1 run context
    const runCtx1 = poc.startCurrentNodeGameplay();
    expect(runCtx1?.gameId).toBe("asteroids");

    // Submit perfect Act 1 result
    const result1: MiniGameResult = {
      runId: runCtx1!.runId,
      gameId: "asteroids",
      score: 1500,
      completed: true,
      durationMs: 30000,
      metrics: { collisions: 0 },
      secretsFound: []
    };
    poc.submitGameplayResult(result1);

    expect(poc.storyRuntime.getFlag("heroicEntry")).toBe(true);
    expect(poc.storyRuntime.getCurrentNodeId()).toBe("cutscene_trans_to_spaceinvaders");

    // From transition cutscene, advance to Act 2 Space Invaders gameplay
    poc.storyRuntime.evaluateTransitions();
    expect(poc.storyRuntime.getCurrentNodeId()).toBe("act2_spaceinvaders_gameplay");

    // Launch Act 2 run context
    const runCtx2 = poc.startCurrentNodeGameplay();
    expect(runCtx2?.gameId).toBe("space-invaders");

    // Check active modifiers for Space Invaders (heroic entry -> extraLives: 0)
    const extraLivesMod = runCtx2?.modifiers.find((m) => m.targetProperty === "extraLives");
    expect(extraLivesMod?.value).toBe(0);

    // Submit high score Space Invaders result
    const result2: MiniGameResult = {
      runId: runCtx2!.runId,
      gameId: "space-invaders",
      score: 6500,
      completed: true,
      durationMs: 45000,
      metrics: { invadersDestroyed: 40 },
      secretsFound: []
    };
    poc.submitGameplayResult(result2);

    expect(poc.storyRuntime.getFlag("reinforcementsReceived")).toBe(true);
    expect(poc.storyRuntime.getCurrentNodeId()).toBe("cutscene_trans_to_asteroids_redux");

    // From transition cutscene, advance to Act 3 Asteroids Redux gameplay
    poc.storyRuntime.evaluateTransitions();
    expect(poc.storyRuntime.getCurrentNodeId()).toBe("act3_asteroids_redux_gameplay");

    // Launch Act 3 run context
    const runCtx3 = poc.startCurrentNodeGameplay();
    const shieldMod = runCtx3?.modifiers.find((m) => m.targetProperty === "shieldMultiplier");
    expect(shieldMod?.value).toBe(1.5);

    // Submit Act 3 result
    const result3: MiniGameResult = {
      runId: runCtx3!.runId,
      gameId: "asteroids",
      score: 4000,
      completed: true,
      durationMs: 50000,
      metrics: {},
      secretsFound: []
    };
    poc.submitGameplayResult(result3);

    // Verify ending reached is Flawless Victory
    expect(poc.storyRuntime.getCurrentNodeId()).toBe("ending_flawless");
    expect(poc.storyRuntime.getCurrentNode()?.isEndNode).toBe(true);

    // Check timeline events recorded in runtime
    const timeline = poc.storyRuntime.getTimeline().all();
    expect(timeline.length).toBeGreaterThan(5);
  });

  it("Scenario 2: Executes Pyrrhic Victory Run (Struggling Entry + Reinforcements Received)", () => {
    const poc = new MultiGameStoryProofOfConcept();
    poc.startCampaign();

    poc.storyRuntime.navigateToNode("act1_asteroids_gameplay");
    const runCtx1 = poc.startCurrentNodeGameplay();

    // Submit failed / struggling Act 1 result
    const result1: MiniGameResult = {
      runId: runCtx1!.runId,
      gameId: "asteroids",
      score: 400,
      completed: false,
      durationMs: 30000,
      metrics: { collisions: 4 },
      secretsFound: []
    };
    poc.submitGameplayResult(result1);

    expect(poc.storyRuntime.getFlag("heroicEntry")).toBe(false);
    expect(poc.storyRuntime.getCurrentNodeId()).toBe("cutscene_trans_to_spaceinvaders");

    poc.storyRuntime.evaluateTransitions();
    expect(poc.storyRuntime.getCurrentNodeId()).toBe("act2_spaceinvaders_gameplay");

    const runCtx2 = poc.startCurrentNodeGameplay();
    const extraLivesMod = runCtx2?.modifiers.find((m) => m.targetProperty === "extraLives");
    expect(extraLivesMod?.value).toBe(2);

    // Submit high score Space Invaders result
    const result2: MiniGameResult = {
      runId: runCtx2!.runId,
      gameId: "space-invaders",
      score: 5500,
      completed: true,
      durationMs: 40000,
      metrics: {},
      secretsFound: []
    };
    poc.submitGameplayResult(result2);

    expect(poc.storyRuntime.getFlag("reinforcementsReceived")).toBe(true);
    expect(poc.storyRuntime.getCurrentNodeId()).toBe("cutscene_trans_to_asteroids_redux");

    poc.storyRuntime.evaluateTransitions();
    expect(poc.storyRuntime.getCurrentNodeId()).toBe("act3_asteroids_redux_gameplay");

    const runCtx3 = poc.startCurrentNodeGameplay();
    poc.submitGameplayResult({
      runId: runCtx3!.runId,
      gameId: "asteroids",
      score: 3000,
      completed: true,
      durationMs: 50000,
      metrics: {},
      secretsFound: []
    });

    expect(poc.storyRuntime.getCurrentNodeId()).toBe("ending_pyrrhic");
  });

  it("Scenario 3: Executes Survival Run (Struggling Entry + No Reinforcements)", () => {
    const poc = new MultiGameStoryProofOfConcept();
    poc.startCampaign();

    poc.storyRuntime.navigateToNode("act1_asteroids_gameplay");
    const runCtx1 = poc.startCurrentNodeGameplay();

    poc.submitGameplayResult({
      runId: runCtx1!.runId,
      gameId: "asteroids",
      score: 300,
      completed: false,
      durationMs: 25000,
      metrics: {},
      secretsFound: []
    });

    expect(poc.storyRuntime.getFlag("heroicEntry")).toBe(false);
    expect(poc.storyRuntime.getCurrentNodeId()).toBe("cutscene_trans_to_spaceinvaders");

    poc.storyRuntime.evaluateTransitions();
    expect(poc.storyRuntime.getCurrentNodeId()).toBe("act2_spaceinvaders_gameplay");

    const runCtx2 = poc.startCurrentNodeGameplay();

    // Submit low score Space Invaders result
    poc.submitGameplayResult({
      runId: runCtx2!.runId,
      gameId: "space-invaders",
      score: 2200,
      completed: false,
      durationMs: 35000,
      metrics: {},
      secretsFound: []
    });

    expect(poc.storyRuntime.getFlag("reinforcementsReceived")).toBe(false);
    expect(poc.storyRuntime.getCurrentNodeId()).toBe("cutscene_trans_to_asteroids_redux");

    poc.storyRuntime.evaluateTransitions();
    expect(poc.storyRuntime.getCurrentNodeId()).toBe("act3_asteroids_redux_gameplay");

    const runCtx3 = poc.startCurrentNodeGameplay();
    const shieldMod = runCtx3?.modifiers.find((m) => m.targetProperty === "shieldMultiplier");
    expect(shieldMod?.value).toBe(0.8);

    poc.submitGameplayResult({
      runId: runCtx3!.runId,
      gameId: "asteroids",
      score: 1500,
      completed: true,
      durationMs: 60000,
      metrics: {},
      secretsFound: []
    });

    expect(poc.storyRuntime.getCurrentNodeId()).toBe("ending_survival");
  });
});
