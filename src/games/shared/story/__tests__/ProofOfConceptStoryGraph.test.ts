import { StoryGraphValidator, StoryRuntime } from "@tiny-aster/core";
import { proofOfConceptStoryGraph } from "../ProofOfConceptStoryGraph";

describe("ProofOfConceptStoryGraph Unit Tests", () => {
  it("validates structural integrity of proofOfConceptStoryGraph without errors", () => {
    const result = StoryGraphValidator.validate(proofOfConceptStoryGraph, {
      declaredFlags: [
        "asteroidsPerfect",
        "asteroidsStruggle",
        "heroicEntry",
        "route_space_invaders",
        "route_flappy_bird",
        "reinforcementsReceived",
        "invadersDefeated",
        "debrisNavigated",
        "foundSecretEvidence",
        "reduxClimaxFlawless"
      ],
      declaredVariables: [
        "spaceinvadersScore",
        "asteroidLevelReached",
        "narrativeScore"
      ]
    });

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("initializes at start_node and advances through dialogue", () => {
    const runtime = new StoryRuntime(proofOfConceptStoryGraph);
    expect(runtime.getCurrentNodeId()).toBe("start_node");

    runtime.evaluateTransitions();
    expect(runtime.getCurrentNodeId()).toBe("act1_asteroids_intro");

    runtime.evaluateTransitions();
    expect(runtime.getCurrentNodeId()).toBe("act1_asteroids_gameplay");
  });

  it("branches to heroic entry and presents narrative bridge choices when asteroidsPerfect flag is true", () => {
    const runtime = new StoryRuntime(proofOfConceptStoryGraph);
    runtime.navigateToNode("act1_asteroids_gameplay");
    runtime.setFlag("asteroidsPerfect", true);
    runtime.applyEffect({ type: "completeObjective", objectiveId: "survive-asteroids-wave3" });

    expect(runtime.getFlag("heroicEntry")).toBe(true);
    expect(runtime.getCurrentNodeId()).toBe("narrative_bridge_choice");

    // Select choice to intercept Space Invaders
    runtime.selectChoice("choice_space_invaders");
    expect(runtime.getFlag("route_space_invaders")).toBe(true);
    expect(runtime.getCurrentNodeId()).toBe("act2_spaceinvaders_intro");

    runtime.evaluateTransitions();
    expect(runtime.getCurrentNodeId()).toBe("act2_spaceinvaders_gameplay");
  });

  it("branches to struggling entry and allows selecting Flappy Bird route in narrative bridge", () => {
    const runtime = new StoryRuntime(proofOfConceptStoryGraph);
    runtime.navigateToNode("act1_asteroids_gameplay");
    runtime.setFlag("asteroidsStruggle", true);
    runtime.applyEffect({ type: "completeObjective", objectiveId: "survive-asteroids-wave3" });

    expect(runtime.getFlag("heroicEntry")).toBe(false);
    expect(runtime.getCurrentNodeId()).toBe("narrative_bridge_choice");

    // Select choice to navigate debris via Flappy Bird
    runtime.selectChoice("choice_flappy_bird");
    expect(runtime.getFlag("route_flappy_bird")).toBe(true);
    expect(runtime.getCurrentNodeId()).toBe("act2_flappybird_intro");

    runtime.evaluateTransitions();
    expect(runtime.getCurrentNodeId()).toBe("act2_flappybird_gameplay");
  });

  it("branches to reinforcements success when spaceinvadersScore >= 2000", () => {
    const runtime = new StoryRuntime(proofOfConceptStoryGraph);
    runtime.setFlag("route_space_invaders", true);
    runtime.navigateToNode("act2_spaceinvaders_gameplay");
    runtime.setVariable("spaceinvadersScore", 6000);
    runtime.setFlag("reinforcementsReceived", true);
    runtime.applyEffect({ type: "completeObjective", objectiveId: "repel-invaders-wave" });

    expect(runtime.getFlag("reinforcementsReceived")).toBe(true);
    expect(runtime.getCurrentNodeId()).toBe("branch_reinforcements_success");

    runtime.evaluateTransitions();
    expect(runtime.getCurrentNodeId()).toBe("act3_asteroids_redux_intro");
  });

  it("evaluates final branch to Flawless Victory when both flags are true", () => {
    const runtime = new StoryRuntime(proofOfConceptStoryGraph);
    runtime.setFlag("heroicEntry", true);
    runtime.setFlag("reinforcementsReceived", true);

    runtime.navigateToNode("final_evaluation_branch");
    expect(runtime.getCurrentNodeId()).toBe("ending_flawless");
    expect(runtime.getCurrentNode()?.isEndNode).toBe(true);
  });

  it("evaluates final branch to Pyrrhic Victory when only one flag is true", () => {
    const runtime = new StoryRuntime(proofOfConceptStoryGraph);
    runtime.setFlag("heroicEntry", false);
    runtime.setFlag("reinforcementsReceived", true);

    runtime.navigateToNode("final_evaluation_branch");
    expect(runtime.getCurrentNodeId()).toBe("ending_pyrrhic");
    expect(runtime.getCurrentNode()?.isEndNode).toBe(true);
  });

  it("evaluates final branch to Survival when both flags are false", () => {
    const runtime = new StoryRuntime(proofOfConceptStoryGraph);
    runtime.setFlag("heroicEntry", false);
    runtime.setFlag("reinforcementsReceived", false);

    runtime.navigateToNode("final_evaluation_branch");
    expect(runtime.getCurrentNodeId()).toBe("ending_survival");
    expect(runtime.getCurrentNode()?.isEndNode).toBe(true);
  });

  it("saves and restores checkpoints cleanly during runtime execution", () => {
    const runtime = new StoryRuntime(proofOfConceptStoryGraph);
    runtime.navigateToNode("act1_asteroids_gameplay");
    const cp = runtime.saveCheckpoint("act1_asteroids_gameplay");

    runtime.setFlag("heroicEntry", true);
    runtime.setVariable("spaceinvadersScore", 9999);

    expect(runtime.getFlag("heroicEntry")).toBe(true);

    runtime.forkAt(cp.id);
    expect(runtime.getFlag("heroicEntry")).toBe(false);
    expect(runtime.getVariable("spaceinvadersScore")).toBeUndefined();
  });
});
