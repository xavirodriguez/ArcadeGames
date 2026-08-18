import {
  MiniGameModifierResolver,
  OutcomeRuleEngine,
  StoryRuntimeSnapshot,
  MiniGameResult,
  MiniGameRunContext
} from "@tiny-aster/core";
import {
  escapeRoute01Encounter,
  AsteroidsArcadeAdapter,
  ESCAPE_ROUTE_01_ENCOUNTER_ID
} from "../story/EscapeRouteEncounter";

describe("Asteroids escape_route_01 Encounter Test Suite", () => {
  let resolver: MiniGameModifierResolver;
  let ruleEngine: OutcomeRuleEngine;

  beforeEach(() => {
    resolver = new MiniGameModifierResolver();
    ruleEngine = new OutcomeRuleEngine();
  });

  it("has correct encounter metadata and ID", () => {
    expect(escapeRoute01Encounter.id).toBe(ESCAPE_ROUTE_01_ENCOUNTER_ID);
    expect(escapeRoute01Encounter.gameId).toBe("asteroids");
  });

  it("applies low reactor power penalty and navigation assist modifiers based on StoryRuntimeSnapshot", () => {
    const snapshot: StoryRuntimeSnapshot = {
      graphId: "asteroids_campaign",
      currentNodeId: "debris_field_node",
      flags: { navigationData: true },
      variables: { reactorPower: 30 },
      selectedChoices: [],
      objectives: {},
      evidence: [],
      history: ["debris_field_node"]
    };

    const modifiers = resolver.resolve(snapshot, escapeRoute01Encounter);
    expect(modifiers).toHaveLength(2);

    const shieldMod = modifiers.find((m) => m.targetProperty === "shieldMultiplier");
    expect(shieldMod).toBeDefined();
    expect(shieldMod?.value).toBe(0.5);

    const navMod = modifiers.find((m) => m.targetProperty === "navigationAssist");
    expect(navMod).toBeDefined();
    expect(navMod?.value).toBe(true);
  });

  it("evaluates cumulative outcome rules A, B, and C simultaneously when conditions are met", () => {
    const result: MiniGameResult = {
      runId: "run_asteroids_01",
      gameId: "asteroids",
      score: 1500,
      completed: true,
      durationMs: 40000,
      metrics: {
        collisions: 7
      },
      secretsFound: ["black_box_fragment"]
    };

    const effects = ruleEngine.evaluate(result, escapeRoute01Encounter.outcomeRules);

    // Rule A: Success -> escapedDebrisField = true
    expect(effects).toContainEqual({
      type: "setFlag",
      key: "escapedDebrisField",
      value: true
    });

    // Rule B: Severe Damage (collisions >= 5) -> oxygen -= 25, escapeShipDamaged = true
    expect(effects).toContainEqual({
      type: "incrementVariable",
      key: "oxygen",
      amount: -25
    });
    expect(effects).toContainEqual({
      type: "setFlag",
      key: "escapeShipDamaged",
      value: true
    });

    // Rule C: Black Box -> discoverEvidence("black_box_fragment")
    expect(effects).toContainEqual({
      type: "discoverEvidence",
      evidenceId: "black_box_fragment"
    });
  });

  it("initializes and disposes AsteroidsArcadeAdapter cleanly", () => {
    const adapter = new AsteroidsArcadeAdapter();
    const runContext: MiniGameRunContext = {
      runId: "run_test_adapter",
      encounterId: ESCAPE_ROUTE_01_ENCOUNTER_ID,
      gameId: "asteroids",
      seed: 12345,
      config: { targetScore: 1000 },
      modifiers: [
        { id: "mod1", targetProperty: "shieldMultiplier", value: 0.5 }
      ]
    };

    let capturedResult: MiniGameResult | null = null;
    adapter.onResult((res: MiniGameResult) => {
      capturedResult = res;
    });

    const mockHost = {} as HTMLElement;
    adapter.initialize(runContext, mockHost);

    // Emit mock game over event
    adapter.emitResult(runContext, {
      score: 1200,
      completed: true,
      collisions: 2,
      foundBlackBox: true
    });

    expect(capturedResult).not.toBeNull();
    if (capturedResult) {
      expect((capturedResult as MiniGameResult).score).toBe(1200);
      expect((capturedResult as MiniGameResult).secretsFound).toContain("black_box_fragment");
    }

    adapter.dispose();
  });
});
