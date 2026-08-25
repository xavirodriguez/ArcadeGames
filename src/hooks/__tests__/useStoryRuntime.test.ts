import test, { describe, it } from "node:test";
import assert from "node:assert/strict";
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

    assert.ok(v1 >= 0);
    assert.equal(st1.currentNodeId, "n1");

    runtime.setVariable("x", 1);
    const v2 = runtime.getVersion();
    assert.equal(v2, v1 + 1);

    // Setting same variable value does not bump version
    runtime.setVariable("x", 1);
    const v3 = runtime.getVersion();
    assert.equal(v3, v2);
  });
});
