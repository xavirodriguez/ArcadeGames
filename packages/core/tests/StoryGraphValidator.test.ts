import { StoryGraph } from "../src/story/StoryTypes";
import { StoryGraphValidator, StoryGraphValidationError } from "../src/story/StoryGraphValidator";

describe("StoryGraphValidator Unit Tests", () => {
  it("should validate a completely valid story graph with zero errors or warnings", () => {
    const validGraph: StoryGraph = {
      id: "valid_graph",
      title: "Valid Campaign",
      entryNodeId: "node_start",
      nodes: {
        node_start: {
          id: "node_start",
          type: "dialogue",
          transitions: [
            {
              targetNodeId: "node_choice",
              condition: { type: "variable", key: "playerLevel", value: 1, operator: ">=" }
            }
          ]
        },
        node_choice: {
          id: "node_choice",
          type: "choice",
          choices: [
            { id: "c1", titleKey: "Option A", targetNodeId: "node_end" }
          ]
        },
        node_end: {
          id: "node_end",
          type: "cutscene",
          isEndNode: true
        }
      }
    };

    const result = StoryGraphValidator.validate(validGraph, {
      declaredVariables: ["playerLevel"]
    });

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.warnings).toHaveLength(0);
  });

  it("should detect invalid entry node", () => {
    const graph: StoryGraph = {
      id: "invalid_entry",
      title: "Invalid Entry",
      entryNodeId: "missing_start",
      nodes: {
        some_node: {
          id: "some_node",
          type: "dialogue",
          isEndNode: true
        }
      }
    };

    const result = StoryGraphValidator.validate(graph);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e: StoryGraphValidationError) => e.type === "invalid_entry_node")).toBe(true);
  });

  it("should detect orphan nodes unreachable from entry node or transitions", () => {
    const graph: StoryGraph = {
      id: "orphan_graph",
      title: "Orphan Campaign",
      entryNodeId: "node_start",
      nodes: {
        node_start: {
          id: "node_start",
          type: "dialogue",
          transitions: [{ targetNodeId: "node_end" }]
        },
        node_end: {
          id: "node_end",
          type: "cutscene",
          isEndNode: true
        },
        node_orphan: {
          id: "node_orphan",
          type: "dialogue",
          isEndNode: true
        }
      }
    };

    const result = StoryGraphValidator.validate(graph);
    expect(result.warnings.some((w: StoryGraphValidationError) => w.type === "orphan_node" && w.nodeId === "node_orphan")).toBe(true);
  });

  it("should detect broken transitions pointing to non-existent target nodes", () => {
    const graph: StoryGraph = {
      id: "broken_transition_graph",
      title: "Broken Transition Campaign",
      entryNodeId: "node_start",
      nodes: {
        node_start: {
          id: "node_start",
          type: "dialogue",
          transitions: [{ targetNodeId: "non_existent_node" }]
        }
      }
    };

    const result = StoryGraphValidator.validate(graph);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e: StoryGraphValidationError) => e.type === "broken_transition" && e.targetNodeId === "non_existent_node")).toBe(true);
  });

  it("should detect unintended dead-end nodes missing outgoing transitions and not marked as end nodes", () => {
    const graph: StoryGraph = {
      id: "dead_end_graph",
      title: "Dead End Campaign",
      entryNodeId: "node_start",
      nodes: {
        node_start: {
          id: "node_start",
          type: "dialogue"
        }
      }
    };

    const result = StoryGraphValidator.validate(graph);
    expect(result.warnings.some((w: StoryGraphValidationError) => w.type === "dead_end" && w.nodeId === "node_start")).toBe(true);
  });

  it("should detect conditions referencing undeclared variables when schema is provided", () => {
    const graph: StoryGraph = {
      id: "undeclared_var_graph",
      title: "Undeclared Var Campaign",
      entryNodeId: "node_start",
      nodes: {
        node_start: {
          id: "node_start",
          type: "dialogue",
          transitions: [
            {
              targetNodeId: "node_end",
              condition: { type: "variable", key: "unknownVar", value: 10 }
            }
          ]
        },
        node_end: {
          id: "node_end",
          type: "cutscene",
          isEndNode: true
        }
      }
    };

    const result = StoryGraphValidator.validate(graph, {
      declaredVariables: ["knownVar1", "knownVar2"]
    });

    expect(result.valid).toBe(false);
    expect(result.errors.some((e: StoryGraphValidationError) => e.type === "undeclared_variable" && e.variableKey === "unknownVar")).toBe(true);
  });
});
