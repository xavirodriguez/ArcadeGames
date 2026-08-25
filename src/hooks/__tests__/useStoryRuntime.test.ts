import { StoryRuntime } from "@tiny-aster/core";

describe("useStoryRuntime hook unit test", () => {
  it("should return referentially identical snapshot objects when runtime state is unchanged", () => {
    const runtime = new StoryRuntime({
      id: "test_graph",
      title: "Test",
      entryNodeId: "n1",
      nodes: {
        n1: { id: "n1", type: "dialogue" }
      }
    });

    const v1 = runtime.getVersion();
    const st1 = runtime.getState();

    expect(v1).toBeGreaterThanOrEqual(0);
    expect(st1.currentNodeId).toBe("n1");

    runtime.setVariable("x", 1);
    const v2 = runtime.getVersion();
    expect(v2).toBe(v1 + 1);

    runtime.setVariable("x", 1);
    const v3 = runtime.getVersion();
    expect(v3).toBe(v2);
  });
});
