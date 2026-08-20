import { StorySaveMigrations } from "../src/story/StorySaveMigrations";

describe("StorySaveMigrations", () => {
  it("handles null, undefined, and non-object raw input safely", () => {
    const migratedNull = StorySaveMigrations.migrateNarrativeSave(null);
    expect(migratedNull.saveVersion).toBe(1);
    expect(migratedNull.story.flags).toEqual({});
    expect(migratedNull.story.variables).toEqual({});
    expect(migratedNull.evidence).toEqual([]);

    const migratedUndefined = StorySaveMigrations.migrateNarrativeSave(undefined);
    expect(migratedUndefined.saveVersion).toBe(1);
  });

  it("migrates a legacy unnested StoryState object", () => {
    const legacyState = {
      graphId: "graph_1",
      currentNodeId: "node_start",
      flags: { flag1: true },
      variables: { health: 100 },
      selectedChoices: ["choice_a"],
      history: ["node_start"]
    };

    const result = StorySaveMigrations.migrateNarrativeSave(legacyState);
    expect(result.saveVersion).toBe(1);
    expect(result.story.graphId).toBe("graph_1");
    expect(result.story.currentNodeId).toBe("node_start");
    expect(result.story.flags).toEqual({ flag1: true });
    expect(result.story.variables).toEqual({ health: 100 });
    expect(result.story.selectedChoices).toEqual(["choice_a"]);
    expect(result.story.history).toEqual(["node_start"]);
  });

  it("normalizes malformed arrays and preserves objectives, flags, and variables", () => {
    const malformed = {
      story: {
        graphId: "graph_2",
        currentNodeId: "node_2",
        flags: { test_flag: 1 as any },
        variables: { score: 250 },
        selectedChoices: ["c1", 123 as any, null],
        objectives: {
          obj_1: {
            id: "obj_1",
            targetCount: 5,
            currentCount: 3,
            completed: false
          }
        },
        evidence: ["ev_1", 456 as any],
        history: ["n1", "n2"]
      },
      evidence: ["ev_1", "ev_2"]
    };

    const result = StorySaveMigrations.migrateNarrativeSave(malformed);
    expect(result.story.flags.test_flag).toBe(true);
    expect(result.story.variables.score).toBe(250);
    expect(result.story.selectedChoices).toEqual(["c1"]);
    expect(result.story.objectives.obj_1.targetCount).toBe(5);
    expect(result.story.objectives.obj_1.currentCount).toBe(3);
    expect(result.evidence).toEqual(["ev_1", "ev_2"]);
  });
});
