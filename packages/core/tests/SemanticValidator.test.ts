import {
  MiniGameEncounterDSL,
  MiniGameEncounterSchema,
  SemanticValidator,
  SemanticValidationContext
} from "../src/story";

describe("Encounter DSL & Semantic Validator Test Suite", () => {
  const validEncounterJson = {
    schemaVersion: 1,
    contentVersion: "1.0.0",
    id: "escape_route_01",
    gameId: "asteroids",
    baseConfig: {
      difficulty: "normal",
      timeLimitMs: 60000,
      targetScore: 1000
    },
    outcomeRules: [
      {
        id: "rule_success",
        priority: 10,
        condition: {
          field: "completed",
          operator: "==",
          value: true
        },
        effects: [
          {
            type: "setFlag",
            key: "escapedDebrisField",
            value: true
          }
        ]
      },
      {
        id: "rule_black_box",
        priority: 30,
        condition: {
          secret: "black_box_fragment"
        },
        effects: [
          {
            type: "discoverEvidence",
            evidenceId: "black_box_fragment"
          }
        ]
      }
    ]
  };

  it("parses valid encounter JSON successfully using Zod schema", () => {
    const result = MiniGameEncounterSchema.safeParse(validEncounterJson);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.id).toBe("escape_route_01");
      expect(result.data.outcomeRules.length).toBe(2);
    }
  });

  it("fails parsing when required fields are missing or invalid type", () => {
    const invalidJson = {
      id: "invalid_encounter",
      gameId: "asteroids",
      outcomeRules: [
        {
          id: "r1",
          priority: "high", // Invalid type: expected number
          condition: { field: "score", operator: ">", value: 100 },
          effects: []
        }
      ]
    };

    const result = MiniGameEncounterSchema.safeParse(invalidJson);
    expect(result.success).toBe(false);
  });

  it("detects semantic validation errors (unknown game, missing evidence, missing target node)", () => {
    const encounter: MiniGameEncounterDSL = {
      schemaVersion: 1,
      contentVersion: "1.0.0",
      id: "encounter_test",
      gameId: "unknown_game_99",
      outcomeRules: [
        {
          id: "rule_1",
          priority: 10,
          condition: { field: "completed", operator: "==", value: true },
          effects: [
            {
              type: "discoverEvidence",
              evidenceId: "non_existent_evidence"
            },
            {
              type: "navigateToNode",
              nodeId: "non_existent_node"
            }
          ]
        }
      ]
    };

    const context: SemanticValidationContext = {
      knownGameIds: ["asteroids", "pong"],
      knownEvidenceIds: ["black_box_fragment"],
      storyGraph: {
        id: "g1",
        title: "G1",
        entryNodeId: "n1",
        nodes: { n1: { id: "n1", type: "dialogue" } }
      }
    };

    const errors = SemanticValidator.validate(encounter, context);
    expect(errors.length).toBe(3);

    expect(errors.some((e) => e.code === "UNKNOWN_GAME_ID")).toBe(true);
    expect(errors.some((e) => e.code === "UNKNOWN_EVIDENCE_ID")).toBe(true);
    expect(errors.some((e) => e.code === "UNKNOWN_TARGET_NODE")).toBe(true);
  });

  it("detects warnings for unknown metrics and secrets", () => {
    const encounter: MiniGameEncounterDSL = {
      schemaVersion: 1,
      contentVersion: "1.0.0",
      id: "encounter_test_2",
      gameId: "asteroids",
      outcomeRules: [
        {
          id: "rule_1",
          priority: 10,
          condition: {
            all: [
              { metric: "unknown_metric", operator: ">", value: 10 },
              { secret: "unknown_secret" }
            ]
          },
          effects: []
        }
      ]
    };

    const context: SemanticValidationContext = {
      knownGameIds: ["asteroids"],
      knownMetrics: ["collisions"],
      knownSecrets: ["black_box_fragment"]
    };

    const errors = SemanticValidator.validate(encounter, context);
    expect(errors.length).toBe(2);
    expect(errors.every((e) => e.severity === "warning")).toBe(true);
  });
});
