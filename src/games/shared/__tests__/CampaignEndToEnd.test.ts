import React from "react";
import { CampaignScreen } from "../../../components/CampaignScreen";
import {
  StoryRuntime,
  EventBus,
  GameDefinitionRegistry,
  MiniGameResult,
  OutcomeRuleEngine,
  StoryEffectApplier
} from "@tiny-aster/core";
import { proofOfConceptStoryGraph } from "../story/ProofOfConceptStoryGraph";
import {
  asteroidsPOCEncounter,
  spaceInvadersPOCEncounter,
  asteroidsReduxPOCEncounter
} from "../story/StoryEncounters";
import { registerDefaultCampaignGames } from "../../../services/CampaignGameRegistryService";

describe("Campaign End-to-End Campaign Flow (Act 1 -> Act 2 -> Act 3 -> End Node)", () => {
  beforeAll(() => {
    registerDefaultCampaignGames();
  });

  it("advances from start_node to Act 1 -> Act 2 -> Act 3 -> Terminal Ending Node via gameplay results", () => {
    const eventBus = new EventBus();
    const runtime = new StoryRuntime(proofOfConceptStoryGraph);
    runtime.bindEventBus(eventBus);

    const ruleEngine = new OutcomeRuleEngine();
    const effectApplier = new StoryEffectApplier();

    // 1. Initial State: start_node
    expect(runtime.getCurrentNode()?.id).toBe("start_node");

    // Advance dialogue node start_node -> act1_asteroids_intro -> act1_asteroids_gameplay
    runtime.evaluateTransitions(); // start_node -> act1_asteroids_intro
    runtime.evaluateTransitions(); // act1_asteroids_intro -> act1_asteroids_gameplay

    let currentNode = runtime.getCurrentNode();
    expect(currentNode?.id).toBe("act1_asteroids_gameplay");
    expect(currentNode?.type).toBe("gameplay");

    // 2. Complete Act 1 (Asteroids) via gameplay result
    const act1Result: MiniGameResult = {
      runId: "run_act1",
      gameId: "asteroids",
      score: 1500,
      completed: true,
      durationMs: 40000,
      metrics: {},
      secretsFound: []
    };

    const act1Effects = ruleEngine.evaluate(act1Result, asteroidsPOCEncounter.outcomeRules);
    effectApplier.applyEffects(runtime, act1Effects);

    if (currentNode?.objective) {
      runtime.applyEffect({
        type: "completeObjective",
        objectiveId: currentNode.objective.id
      });
    }

    // Evaluate transitions automatically out of Act 1 gameplay
    runtime.evaluateTransitions();

    // Traverses eval_act1_performance -> branch_heroic_entry -> cutscene_trans_to_spaceinvaders -> act2_spaceinvaders_gameplay
    currentNode = runtime.getCurrentNode();
    expect(currentNode?.id).toBe("act2_spaceinvaders_gameplay");
    expect(currentNode?.type).toBe("gameplay");

    // 3. Complete Act 2 (Space Invaders) via gameplay result
    const act2Result: MiniGameResult = {
      runId: "run_act2",
      gameId: "space-invaders",
      score: 6000,
      completed: true,
      durationMs: 50000,
      metrics: {},
      secretsFound: []
    };

    const act2Effects = ruleEngine.evaluate(act2Result, spaceInvadersPOCEncounter.outcomeRules);
    effectApplier.applyEffects(runtime, act2Effects);
    runtime.setVariable("spaceinvadersScore", act2Result.score);

    if (currentNode?.objective) {
      runtime.applyEffect({
        type: "completeObjective",
        objectiveId: currentNode.objective.id
      });
    }

    runtime.evaluateTransitions();

    // Traverses eval_act2_performance -> branch_reinforcements_success -> cutscene_trans_to_asteroids_redux -> act3_asteroids_redux_gameplay
    currentNode = runtime.getCurrentNode();
    expect(currentNode?.id).toBe("act3_asteroids_redux_gameplay");
    expect(currentNode?.type).toBe("gameplay");

    // 4. Complete Act 3 (Asteroids Redux) via gameplay result
    const act3Result: MiniGameResult = {
      runId: "run_act3",
      gameId: "asteroids",
      score: 4000,
      completed: true,
      durationMs: 60000,
      metrics: {},
      secretsFound: []
    };

    const act3Effects = ruleEngine.evaluate(act3Result, asteroidsReduxPOCEncounter.outcomeRules);
    effectApplier.applyEffects(runtime, act3Effects);

    if (currentNode?.objective) {
      runtime.applyEffect({
        type: "completeObjective",
        objectiveId: currentNode.objective.id
      });
    }

    runtime.evaluateTransitions();

    // Traverses final_evaluation_branch -> ending_flawless
    currentNode = runtime.getCurrentNode();
    expect(currentNode?.id).toBe("ending_flawless");
    expect(currentNode?.isEndNode).toBe(true);

    // 5. Test Campaign Restart
    runtime.loadGraph(proofOfConceptStoryGraph, true);
    const restartedNode = runtime.getCurrentNode();
    // Dialogue/cutscene nodes auto-advance through conditionless transitions until gameplay node
    expect(restartedNode?.id).toBe("act1_asteroids_gameplay");
  });
});
