import {
  StoryRuntime,
  OutcomeRuleEngine,
  MiniGameModifierResolver,
  MiniGameRunContext,
  MiniGameResult,
  StoryRuntimeSnapshot
} from "@tiny-aster/core";
import { proofOfConceptStoryGraph } from "../ProofOfConceptStoryGraph";
import {
  asteroidsPOCEncounter,
  spaceInvadersPOCEncounter,
  asteroidsReduxPOCEncounter
} from "../StoryEncounters";

describe("ProofOfConceptStoryGraph End-to-End Campaign Tests", () => {
  const resolver = new MiniGameModifierResolver();
  const outcomeEngine = new OutcomeRuleEngine();

  function toSnapshot(state: ReturnType<StoryRuntime["getState"]>): StoryRuntimeSnapshot {
    return {
      graphId: state.graphId,
      currentNodeId: state.currentNodeId,
      flags: state.flags,
      variables: state.variables,
      selectedChoices: state.selectedChoices,
      objectives: state.objectives,
      evidence: state.evidence,
      history: state.history
    };
  }

  it("should have valid graph structure with expected node count", () => {
    expect(proofOfConceptStoryGraph.id).toBe("poc_multi_game_campaign");
    const nodeCount = Object.keys(proofOfConceptStoryGraph.nodes).length;
    expect(nodeCount).toBeGreaterThanOrEqual(15);
  });

  it("should navigate Flawless Victory path successfully", () => {
    const runtime = new StoryRuntime(proofOfConceptStoryGraph);

    // Node 1: Start dialogue
    expect(runtime.getCurrentNodeId()).toBe("poc_start");
    runtime.evaluateTransitions();

    // Node 2: Briefing dialogue
    expect(runtime.getCurrentNodeId()).toBe("poc_briefing");
    runtime.evaluateTransitions();

    // Node 3: Prep choice
    expect(runtime.getCurrentNodeId()).toBe("poc_act1_prep");

    // Select aggressive entry choice
    runtime.selectChoice("choice_aggressive_entry");

    // Node 4: Asteroids Gameplay Node
    expect(runtime.getCurrentNodeId()).toBe("poc_act1_asteroids");

    // Simulate objective completion with 0 deaths
    runtime.setVariable("asteroidsDeaths", 0);
    runtime.applyEffect({ type: "completeObjective", objectiveId: "obj_asteroids_sweep" });
    runtime.evaluateTransitions();

    // Traverses branch -> heroic diag -> transition cutscene -> act2 prep dialogue
    expect(runtime.getFlag("heroicEntry")).toBe(true);
    expect(runtime.getCurrentNodeId()).toBe("poc_act2_prep");

    // Advance past Act 2 prep dialogue to SI gameplay
    runtime.evaluateTransitions();
    expect(runtime.getCurrentNodeId()).toBe("poc_act2_space_invaders");

    // Resolve Space Invaders Modifiers for Heroic Entry
    const snapshot = toSnapshot(runtime.getState());
    const siContext: MiniGameRunContext = {
      runId: "run_si_1",
      gameId: "space-invaders",
      encounterId: spaceInvadersPOCEncounter.id,
      seed: 12345,
      config: spaceInvadersPOCEncounter.baseConfig || {},
      modifiers: resolver.resolve(snapshot, spaceInvadersPOCEncounter)
    };
    const livesMod = siContext.modifiers.find((m) => m.targetProperty === "extraLives");
    expect(livesMod?.value).toBe(0); // Handicap applied

    // Simulate high score outcome (> 5000)
    const siResult: MiniGameResult = {
      runId: "run_si_1",
      gameId: "space-invaders",
      score: 6500,
      completed: true,
      durationMs: 40000,
      metrics: { score: 6500 },
      secretsFound: []
    };
    const siEffects = outcomeEngine.evaluate(siResult, spaceInvadersPOCEncounter.outcomeRules);
    runtime.applyEffects(siEffects);
    runtime.applyEffect({ type: "completeObjective", objectiveId: "obj_space_invaders_waves" });
    runtime.evaluateTransitions();

    // Traverses highscore diag -> redux transition dialogue
    expect(runtime.getFlag("reinforcementsReceived")).toBe(true);
    expect(runtime.getVariable("narrativeScore")).toBe(100);
    expect(runtime.getCurrentNodeId()).toBe("poc_transition_asteroids_redux");

    // Advance past redux prep dialogue to Redux gameplay
    runtime.evaluateTransitions();
    expect(runtime.getCurrentNodeId()).toBe("poc_act3_asteroids_redux");

    // Resolve Redux modifiers (reinforcementsReceived = true => shieldMultiplier = 1.5)
    const reduxSnapshot = toSnapshot(runtime.getState());
    const reduxMods = resolver.resolve(reduxSnapshot, asteroidsReduxPOCEncounter);
    const shieldMod = reduxMods.find((m) => m.targetProperty === "shieldMultiplier");
    expect(shieldMod?.value).toBe(1.5);

    runtime.applyEffect({ type: "completeObjective", objectiveId: "obj_asteroids_redux_final" });
    runtime.evaluateTransitions();

    // Act 3 Branch -> Ending Flawless
    expect(runtime.getCurrentNodeId()).toBe("poc_ending_flawless");
  });

  it("should navigate Pyrrhic Victory path when heroic fails but reinforcements succeed", () => {
    const runtime = new StoryRuntime(proofOfConceptStoryGraph);

    expect(runtime.getCurrentNodeId()).toBe("poc_start");
    runtime.evaluateTransitions();
    runtime.evaluateTransitions();

    expect(runtime.getCurrentNodeId()).toBe("poc_act1_prep");
    runtime.selectChoice("choice_cautious_entry");

    // Simulate deaths in Act 1
    runtime.setVariable("asteroidsDeaths", 2);
    runtime.applyEffect({ type: "completeObjective", objectiveId: "obj_asteroids_sweep" });
    runtime.evaluateTransitions();

    // Traverses struggle diag -> transition cutscene -> act2 prep dialogue
    expect(runtime.getFlag("heroicEntry")).toBe(false);
    expect(runtime.getCurrentNodeId()).toBe("poc_act2_prep");

    runtime.evaluateTransitions();
    expect(runtime.getCurrentNodeId()).toBe("poc_act2_space_invaders");

    // Resolve Space Invaders Modifiers for Struggle Entry
    const snapshot = toSnapshot(runtime.getState());
    const siMods = resolver.resolve(snapshot, spaceInvadersPOCEncounter);
    const livesMod = siMods.find((m) => m.targetProperty === "extraLives");
    expect(livesMod?.value).toBe(2); // Bonus lives applied

    // High score in SI
    const siResult: MiniGameResult = {
      runId: "run_si_2",
      gameId: "space-invaders",
      score: 5500,
      completed: true,
      durationMs: 40000,
      metrics: { score: 5500 },
      secretsFound: []
    };
    const siEffects = outcomeEngine.evaluate(siResult, spaceInvadersPOCEncounter.outcomeRules);
    runtime.applyEffects(siEffects);
    runtime.applyEffect({ type: "completeObjective", objectiveId: "obj_space_invaders_waves" });
    runtime.evaluateTransitions();

    expect(runtime.getFlag("reinforcementsReceived")).toBe(true);
    expect(runtime.getCurrentNodeId()).toBe("poc_transition_asteroids_redux");

    runtime.evaluateTransitions();
    expect(runtime.getCurrentNodeId()).toBe("poc_act3_asteroids_redux");

    runtime.applyEffect({ type: "completeObjective", objectiveId: "obj_asteroids_redux_final" });
    runtime.evaluateTransitions();

    // Branch -> Pyrrhic Ending (one true, one false)
    expect(runtime.getCurrentNodeId()).toBe("poc_ending_pyrrhic");
  });

  it("should navigate Survival path when both heroic and reinforcements fail", () => {
    const runtime = new StoryRuntime(proofOfConceptStoryGraph);

    expect(runtime.getCurrentNodeId()).toBe("poc_start");
    runtime.evaluateTransitions();
    runtime.evaluateTransitions();

    expect(runtime.getCurrentNodeId()).toBe("poc_act1_prep");
    runtime.selectChoice("choice_cautious_entry");

    runtime.setVariable("asteroidsDeaths", 1);
    runtime.applyEffect({ type: "completeObjective", objectiveId: "obj_asteroids_sweep" });
    runtime.evaluateTransitions();

    expect(runtime.getFlag("heroicEntry")).toBe(false);
    expect(runtime.getCurrentNodeId()).toBe("poc_act2_prep");

    runtime.evaluateTransitions();
    expect(runtime.getCurrentNodeId()).toBe("poc_act2_space_invaders");

    const siResult: MiniGameResult = {
      runId: "run_si_3",
      gameId: "space-invaders",
      score: 3000,
      completed: true,
      durationMs: 40000,
      metrics: { score: 3000 },
      secretsFound: []
    };
    const siEffects = outcomeEngine.evaluate(siResult, spaceInvadersPOCEncounter.outcomeRules);
    runtime.applyEffects(siEffects);
    runtime.applyEffect({ type: "completeObjective", objectiveId: "obj_space_invaders_waves" });
    runtime.evaluateTransitions();

    expect(runtime.getFlag("reinforcementsReceived")).toBe(false);
    expect(runtime.getCurrentNodeId()).toBe("poc_transition_asteroids_redux");

    runtime.evaluateTransitions();
    expect(runtime.getCurrentNodeId()).toBe("poc_act3_asteroids_redux");

    runtime.applyEffect({ type: "completeObjective", objectiveId: "obj_asteroids_redux_final" });
    runtime.evaluateTransitions();

    // Branch -> Survival Ending (both false)
    expect(runtime.getCurrentNodeId()).toBe("poc_ending_survival");
  });
});
